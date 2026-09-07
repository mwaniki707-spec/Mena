import type { Attachment, Turn } from "@/hooks/use-threads";
import { DEFAULT_BASE_URLS, type ModelProvider } from "@/lib/models";

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type ContentPart = TextPart | ImagePart;
type Msg = { role: "user" | "assistant"; content: string | ContentPart[] };

function buildUserContent(prompt: string, attachments: Attachment[]): string | ContentPart[] {
  // Inject text file contents into the prompt so the model actually sees the file data.
  const textFiles = attachments.filter((a) => a.textContent);
  let fullPrompt = prompt;
  if (textFiles.length > 0) {
    const fileBlocks = textFiles
      .map((a) => `<file name="${a.name}">\n${a.textContent}\n</file>`)
      .join("\n\n");
    fullPrompt = fullPrompt.trim() ? `${fullPrompt}\n\n${fileBlocks}` : fileBlocks;
  }

  const imageParts: ImagePart[] = attachments
    .filter((a) => a.type.startsWith("image/") && a.dataUrl)
    .map((a) => ({ type: "image_url", image_url: { url: a.dataUrl! } }));

  if (imageParts.length === 0) {
    // No images — return the enriched prompt text, falling back to file names so the message is never empty.
    if (fullPrompt.trim()) return fullPrompt;
    const fileNames = attachments.map((a) => a.name).filter(Boolean).join(", ");
    return fileNames || fullPrompt;
  }

  const parts: ContentPart[] = [];
  // Only add a text part if there is actual text — empty text parts are rejected by the API.
  if (fullPrompt.trim()) parts.push({ type: "text", text: fullPrompt });
  parts.push(...imageParts);
  return parts;
}


/** Build the conversation as seen by a particular model slot. */
export function buildHistoryForSlot(
  turns: Turn[],
  slot: number,
  newPrompt: string,
  newAttachments: Attachment[] = [],
): Msg[] {
  const msgs: Msg[] = [];
  for (const t of turns) {
    if (t.targets.includes(slot)) {
      msgs.push({ role: "user", content: buildUserContent(t.prompt, t.attachments ?? []) });
      const resp = t.responses[String(slot)];
      if (resp) msgs.push({ role: "assistant", content: resp });
    }
  }
  msgs.push({ role: "user", content: buildUserContent(newPrompt, newAttachments) });
  return msgs;
}

type StreamOptions = {
  apiKey?: string;
  baseUrl?: string;
  provider?: ModelProvider;
  signal?: AbortSignal;
};

/**
 * Streams a completion directly from the browser to a model's own API. Supports
 * multiple API formats (OpenAI-compatible, Anthropic, Google Gemini) so the app
 * works with any provider, not just OpenAI-compatible ones.
 */
export async function streamCompletion(
  model: string,
  messages: Msg[],
  onDelta: (chunk: string) => void,
  options?: StreamOptions,
): Promise<string> {
  if (messages.some((m) => Array.isArray(m.content) && m.role !== "user")) {
    throw new Error("Only user messages may contain multipart content.");
  }
  const provider = options?.provider ?? "openai";
  const apiKey = options?.apiKey?.trim();
  if (!apiKey) {
    throw new Error("Missing API key for this model. Add one in Settings.");
  }
  const baseUrl = (options?.baseUrl?.trim() || DEFAULT_BASE_URLS[provider]).replace(/\/+$/, "");

  switch (provider) {
    case "anthropic":
      return streamAnthropic(baseUrl, model, apiKey, messages, onDelta, options?.signal);
    case "google":
      return streamGoogle(baseUrl, model, apiKey, messages, onDelta, options?.signal);
    case "openai":
    default:
      return streamOpenAI(baseUrl, model, apiKey, messages, onDelta, options?.signal);
  }
}

/** Reads a Server-Sent Events response, invoking onEvent for each parsed JSON data line. */
async function readSSE(
  res: Response,
  onEvent: (json: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(parseApiError(errText) || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) break;
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          onEvent(JSON.parse(data));
        } catch {
          // Ignore keep-alives / non-JSON lines.
        }
      }
    }
  }
}

async function streamOpenAI(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: Msg[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const isOpenRouter = baseUrl.includes("openrouter.ai");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (isOpenRouter) {
    headers["HTTP-Referer"] = globalThis.location?.origin ?? "https://mena-app-987.web.app";
    headers["X-Title"] = "Mena";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  let full = "";
  await readSSE(
    res,
    (json) => {
      const choice = (json as { choices?: { delta?: { content?: string }; finish_reason?: string }[] })
        ?.choices?.[0];
      const delta = choice?.delta?.content;
      if (delta) {
        full += delta;
        onDelta(delta);
      }
    },
    signal,
  );

  // OpenRouter free models often stream keep-alives with no text; fall back to one-shot.
  if (!full.trim() && isOpenRouter) {
    return completeOpenAI(baseUrl, model, apiKey, messages, onDelta, signal, headers);
  }

  return full;
}

async function completeOpenAI(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: Msg[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
  headers?: Record<string, string>,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: headers ?? {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: false }),
    signal,
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(parseApiError(body) || `Request failed (${res.status})`);
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error("Invalid response from model API.");
  }

  const text =
    (json as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ??
    "";
  if (text) onDelta(text);
  return text;
}

function parseApiError(raw: string): string | null {
  if (!raw.trim()) return null;
  try {
    const json = JSON.parse(raw) as { error?: { message?: string } };
    if (json.error?.message) return json.error.message;
  } catch {
    // Not JSON — use raw text if short enough.
  }
  return raw.length <= 200 ? raw : null;
}

/** Convert multipart user messages to plain text for providers that don't support them. */
function flattenMessageContent(messages: Msg[]): { role: "user" | "assistant"; content: string }[] {
  return messages.map((m) => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content.map((part) => (part.type === "text" ? part.text : "[image]")).join("\n")
      : m.content,
  }));
}

async function streamAnthropic(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: Msg[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for Anthropic to accept direct browser (CORS) requests.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: 4096, messages: flattenMessageContent(messages), stream: true }),
    signal,
  });

  let full = "";
  await readSSE(
    res,
    (json) => {
      const evt = json as { type?: string; delta?: { text?: string } };
      if (evt?.type === "content_block_delta" && evt.delta?.text) {
        full += evt.delta.text;
        onDelta(evt.delta.text);
      }
    },
    signal,
  );
  return full;
}

async function streamGoogle(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: Msg[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const contents = flattenMessageContent(messages).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const endpoint =
    `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=` +
    encodeURIComponent(apiKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
    signal,
  });

  let full = "";
  await readSSE(
    res,
    (json) => {
      const parts = (
        json as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      )?.candidates?.[0]?.content?.parts;
      const text = parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) {
        full += text;
        onDelta(text);
      }
    },
    signal,
  );
  return full;
}
