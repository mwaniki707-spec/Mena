import { KIMI_API_KEY, KIMI_BASE_URL } from "@/lib/env";

export type ModelProvider = "openai" | "anthropic" | "google";

export type ModelEntry = {
  id: string;
  label: string;
  /** Which API format/protocol this model speaks. Defaults to "openai". */
  provider?: ModelProvider;
  /** API base URL. If omitted, the provider's default base URL is used. */
  baseUrl?: string;
  apiKey?: string;
  /** If true, this model is shipped with the app and cannot be removed. */
  builtin?: boolean;
};

export const PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: "OpenAI-compatible",
  anthropic: "Anthropic (Claude)",
  google: "Google Gemini",
};

export const DEFAULT_BASE_URLS: Record<ModelProvider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  google: "https://generativelanguage.googleapis.com",
};

/** Pre-configured Mena assistant & default fallback model */
export const BUILTIN_MODELS: ModelEntry[] = [
  {
    id: "kimi-k2.6",
    label: "Kimi K2.6",
    provider: "openai",
    baseUrl: KIMI_BASE_URL,
    apiKey: KIMI_API_KEY,
    builtin: true,
  },
];

/** Retired models stripped from saved settings on load. */
export const DEPRECATED_MODEL_IDS = new Set([
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "openai/gpt-oss-120b:free",
]);

export const DEFAULT_MODELS: ModelEntry[] = [...BUILTIN_MODELS];

/**
 * Dynamically queries the connected API endpoint to list available models.
 */
export async function fetchModelsFromAPI(
  baseUrl?: string,
  apiKey?: string,
  provider: ModelProvider = "openai",
): Promise<ModelEntry[]> {
  const targetKey = apiKey?.trim() || KIMI_API_KEY || "";
  const targetUrl = (baseUrl?.trim() || KIMI_BASE_URL || DEFAULT_BASE_URLS[provider]).replace(/\/+$/, "");

  if (!targetKey && provider !== "google") {
    return BUILTIN_MODELS;
  }

  try {
    if (provider === "google") {
      const url = `${targetUrl}/v1beta/models?key=${targetKey}`;
      const res = await fetch(url);
      if (!res.ok) return BUILTIN_MODELS;
      const json = await res.json();
      const list = Array.isArray(json.models) ? json.models : [];
      const mapped = list
        .filter((m: any) => m.name && (m.name.includes("gemini") || m.name.includes("chat")))
        .map((m: any) => {
          const modelId = m.name.replace(/^models\//, "");
          return {
            id: modelId,
            label: m.displayName || modelId,
            provider: "google" as ModelProvider,
            baseUrl: targetUrl,
            apiKey: targetKey,
            builtin: true,
          };
        });
      return mapped.length > 0 ? mapped : BUILTIN_MODELS;
    }

    if (provider === "anthropic") {
      const url = `${targetUrl}/v1/models`;
      const res = await fetch(url, {
        headers: {
          "x-api-key": targetKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!res.ok) return BUILTIN_MODELS;
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      const mapped = list.map((m: any) => ({
        id: m.id,
        label: m.display_name || m.id,
        provider: "anthropic" as ModelProvider,
        baseUrl: targetUrl,
        apiKey: targetKey,
        builtin: true,
      }));
      return mapped.length > 0 ? mapped : BUILTIN_MODELS;
    }

    // Default: OpenAI-compatible (Moonshot / Kimi / OpenAI / Ollama / OpenRouter / Groq / etc.)
    const endpoint = targetUrl.endsWith("/models") ? targetUrl : `${targetUrl}/models`;
    const headers: Record<string, string> = {};
    if (targetKey) {
      headers["Authorization"] = `Bearer ${targetKey}`;
    }

    const res = await fetch(endpoint, { headers });
    if (!res.ok) return BUILTIN_MODELS;

    const json = await res.json();
    const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];

    if (list.length === 0) return BUILTIN_MODELS;

    return list.map((m: any) => {
      const id = typeof m === "string" ? m : m.id || m.name;
      const rawLabel = typeof m === "object" && m.name ? m.name : id;
      return {
        id,
        label: formatModelLabel(id, rawLabel),
        provider: "openai" as ModelProvider,
        baseUrl: targetUrl,
        apiKey: targetKey,
        builtin: true,
      };
    });
  } catch (err) {
    console.warn("Could not dynamically fetch models from API:", err);
    return BUILTIN_MODELS;
  }
}

function formatModelLabel(id: string, name?: string): string {
  if (name && name !== id && !name.includes("/")) return name;
  if (id === "kimi-k2.6" || id === "moonshot-v1-8k") return "Kimi K2.6";
  if (id.startsWith("moonshot-v1-")) return `Moonshot ${id.replace("moonshot-v1-", "").toUpperCase()}`;
  return id
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
