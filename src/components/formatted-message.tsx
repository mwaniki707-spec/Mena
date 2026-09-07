import { useState, useMemo, type ReactNode } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Download,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";

function normalize(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n");
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1]) nodes.push(<strong key={`${keyPrefix}-b${i++}`}>{match[1]}</strong>);
    else if (match[2])
      nodes.push(
        <code
          key={`${keyPrefix}-c${i++}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
        >
          {match[2]}
        </code>,
      );
    else if (match[3]) nodes.push(<em key={`${keyPrefix}-i${i++}`}>{match[3]}</em>);
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}

// ─── Interactive JSON Tree Inspector ──────────────────────────────────────────
function JsonTreeViewer({ data }: { data: unknown }) {
  const [collapsed, setCollapsed] = useState(false);

  if (data === null) return <span className="text-rose-400">null</span>;
  if (typeof data === "boolean") return <span className="text-amber-400">{String(data)}</span>;
  if (typeof data === "number") return <span className="text-emerald-400">{data}</span>;
  if (typeof data === "string") return <span className="text-sky-300">"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-400">[]</span>;
    return (
      <div className="pl-3 border-l border-slate-800 my-0.5">
        <button
          onClick={() => {
            setCollapsed(!collapsed);
          }}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span>Array ({data.length})</span>
        </button>
        {!collapsed && (
          <div className="space-y-0.5 pl-2">
            {data.map((item, idx) => (
              <div key={idx} className="text-xs font-mono">
                <span className="text-slate-500 mr-1">{idx}:</span>
                <JsonTreeViewer data={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-slate-400">{"{}"}</span>;
    return (
      <div className="pl-3 border-l border-slate-800 my-0.5">
        <button
          onClick={() => {
            setCollapsed(!collapsed);
          }}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span>Object ({keys.length} keys)</span>
        </button>
        {!collapsed && (
          <div className="space-y-0.5 pl-2">
            {keys.map((k) => (
              <div key={k} className="text-xs font-mono">
                <span className="text-violet-400 mr-1">{k}:</span>
                <JsonTreeViewer data={(data as Record<string, unknown>)[k]} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

// ─── Rich Data Table with CSV Export ──────────────────────────────────────────
function RichTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const [copied, setCopied] = useState(false);

  const copyCsv = () => {
    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    toast.success("Table copied as CSV");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card/60 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <TableIcon className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">Data Table</span>
          <span className="text-[10px] text-muted-foreground">({rows.length} rows)</span>
        </div>
        <button
          onClick={copyCsv}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition hover:bg-card hover:text-foreground"
          title="Copy as CSV"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy CSV"}</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-semibold text-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-foreground/90 font-mono text-[11px]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Upgraded CodeBlock with Living Canvas Trigger ─────────────────────────────
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [showJsonTree, setShowJsonTree] = useState(false);

  const cleanLang = lang.toLowerCase();
  const isSvg = cleanLang === "svg" || code.trim().startsWith("<svg");
  const isHtml = cleanLang === "html" || cleanLang === "htm" || (!isSvg && code.trim().startsWith("<"));
  const isReact = cleanLang === "jsx" || cleanLang === "tsx" || cleanLang === "javascript" || cleanLang === "typescript";
  const isJson = cleanLang === "json";

  const parsedJson = useMemo(() => {
    if (!isJson) return null;
    try {
      return JSON.parse(code);
    } catch {
      return null;
    }
  }, [isJson, code]);

  const canOpenCanvas = isHtml || isSvg || isReact || cleanLang === "css";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenCanvas = () => {
    window.dispatchEvent(
      new CustomEvent("mena:open-canvas", {
        detail: {
          id: crypto.randomUUID(),
          title: isSvg ? "Vector Illustration" : isHtml ? "Interactive Component" : `${lang.toUpperCase()} Artifact`,
          language: lang || "html",
          code: code,
        },
      }),
    );
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-slate-950 text-slate-100 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400">
        <span className="font-mono font-medium text-slate-300">{lang || "code"}</span>
        <div className="flex items-center gap-1.5">
          {/* Living Canvas Button */}
          {canOpenCanvas && (
            <button
              onClick={handleOpenCanvas}
              className="flex items-center gap-1.5 rounded-lg bg-primary/20 px-2 py-0.5 text-primary-foreground font-medium text-[11px] hover:bg-primary/30 transition shadow-xs border border-primary/30"
              title="Open in interactive Living Canvas side-by-side"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Canvas</span>
            </button>
          )}

          {/* JSON Tree Toggle */}
          {parsedJson && (
            <button
              onClick={() => {
                    setShowJsonTree(!showJsonTree);
              }}
              className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-slate-800 hover:text-slate-200"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{showJsonTree ? "Raw" : "Tree"}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-slate-800 hover:text-slate-200"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {showJsonTree && parsedJson ? (
        <div className="p-4 bg-slate-950 font-mono max-h-[360px] overflow-auto">
          <JsonTreeViewer data={parsedJson} />
        </div>
      ) : (
        <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-slate-200">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

// ─── Markdown Blocks & Table Parser ───────────────────────────────────────────
function parseBlocks(text: string): ReactNode[] {
  const normalizedText = normalize(text);
  const blocks: ReactNode[] = [];
  let key = 0;

  // Split by code fences ```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(normalizedText)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = normalizedText.slice(lastIndex, match.index);
      blocks.push(...parseTextLines(textBefore, key++));
    }
    const lang = match[1] || "";
    const code = match[2] || "";
    blocks.push(<CodeBlock key={`code-${key++}`} lang={lang} code={code} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalizedText.length) {
    const textRemaining = normalizedText.slice(lastIndex);
    blocks.push(...parseTextLines(textRemaining, key++));
  }

  return blocks.length ? blocks : [parseInline(normalizedText, "root")];
}

function parseTextLines(text: string, baseKey: number): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] | null = null;
  let listOrdered = false;
  let key = 0;

  const flushList = () => {
    if (!listItems?.length) return;
    const ListTag = listOrdered ? "ol" : "ul";
    const listClass = listOrdered
      ? "my-2 ml-4 list-decimal space-y-1"
      : "my-2 ml-4 list-disc space-y-1";
    blocks.push(
      <ListTag key={`list-${baseKey}-${key++}`} className={listClass}>
        {listItems.map((item, j) => (
          <li key={j}>{parseInline(item, `li-${baseKey}-${key}-${j}`)}</li>
        ))}
      </ListTag>,
    );
    listItems = null;
    listOrdered = false;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      i++;
      continue;
    }

    // Markdown Table Detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (nextTrimmed.startsWith("|") && /^[|\s-:]+$/.test(nextTrimmed)) {
        flushList();
        const rawHeaders = trimmed
          .slice(1, -1)
          .split("|")
          .map((h) => h.trim());

        const rows: string[][] = [];
        i += 2;
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          const rowCells = lines[i]
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          rows.push(rowCells);
          i++;
        }

        blocks.push(<RichTable key={`tbl-${baseKey}-${key++}`} headers={rawHeaders} rows={rows} />);
        continue;
      }
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      blocks.push(
        <p
          key={`h-${baseKey}-${key++}`}
          className={
            level <= 2 ? "mt-3 mb-1 text-base font-semibold" : "mt-2 mb-1 text-sm font-semibold"
          }
        >
          {parseInline(heading[2], `h-${baseKey}-${key}`)}
        </p>,
      );
      i++;
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (listItems && listOrdered) flushList();
      listOrdered = false;
      listItems ??= [];
      listItems.push(bullet[1]);
      i++;
      continue;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      if (listItems && !listOrdered) flushList();
      listOrdered = true;
      listItems ??= [];
      listItems.push(numbered[1]);
      i++;
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${baseKey}-${key++}`} className="my-1">
        {parseInline(trimmed, `p-${baseKey}-${key}`)}
      </p>,
    );
    i++;
  }

  flushList();
  return blocks;
}

type FormattedMessageProps = { text: string; enableSpeech?: boolean };

/** Renders assistant text with markdown, code fences, Living Canvas actions, interactive JSON trees, tables, and TTS. */
export function FormattedMessage({ text, enableSpeech = true }: FormattedMessageProps) {
  const [speaking, setSpeaking] = useState(false);

  const handleToggleSpeak = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/```[\s\S]*?```/g, " code block ").replace(/[*#`]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  return (
    <div className="group relative leading-relaxed">
      {enableSpeech && text.trim() && (
        <button
          onClick={handleToggleSpeak}
          className="absolute -top-2 right-0 hidden rounded-full border border-border bg-background p-1 text-muted-foreground shadow-sm transition hover:text-foreground group-hover:flex"
          title={speaking ? "Stop reading" : "Read aloud"}
          aria-label={speaking ? "Stop reading" : "Read aloud"}
        >
          {speaking ? <VolumeX className="h-3.5 w-3.5 text-primary" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      )}
      {parseBlocks(text)}
    </div>
  );
}
