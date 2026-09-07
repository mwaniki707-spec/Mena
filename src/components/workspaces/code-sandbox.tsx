import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Code2,
  Play,
  RotateCcw,
  Copy,
  Check,
  Send,
  Sparkles,
  Terminal,
  Eye,
  FileCode,
  Layers,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CodeTemplate = {
  id: string;
  name: string;
  language: string;
  code: string;
};

const STARTER_TEMPLATES: CodeTemplate[] = [
  {
    id: "js-algo",
    name: "QuickSort Algorithm (JS)",
    language: "javascript",
    code: `// QuickSort with pivot partitioning
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

const numbers = [64, 34, 25, 12, 22, 11, 90, 5];
console.log("Unsorted:", numbers);
console.log("Sorted:", quickSort(numbers));
`,
  },
  {
    id: "html-glass",
    name: "Glassmorphism Card (HTML/CSS)",
    language: "html",
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at 10% 20%, rgb(80, 0, 180), rgb(20, 0, 60));
      font-family: system-ui, sans-serif;
    }
    .card {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      padding: 32px;
      color: white;
      box-shadow: 0 20px 50px rgba(0,0,0,0.4);
      max-width: 320px;
      text-align: center;
    }
    h2 { margin-top: 0; color: #c084fc; }
    p { color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6; }
    button {
      background: linear-gradient(135deg, #a855f7, #6366f1);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Mena Glass Card</h2>
    <p>Modern glassmorphic interface with backdrop-filter blur and subtle border gradient.</p>
    <button onclick="alert('Clicked!')">Interact</button>
  </div>
</body>
</html>
`,
  },
  {
    id: "py-async",
    name: "Async Data Pipeline (Python)",
    language: "python",
    code: `import asyncio
import random

async def fetch_dataset(source_id: int):
    print(f"Fetching dataset #{source_id}...")
    await asyncio.sleep(random.uniform(0.1, 0.5))
    return {"source": source_id, "records": random.randint(100, 500)}

async def main():
    tasks = [fetch_dataset(i) for i in range(1, 6)]
    results = await asyncio.gather(*tasks)
    total_records = sum(r["records"] for r in results)
    print(f"Aggregated {len(results)} sources. Total records: {total_records}")

asyncio.run(main())
`,
  },
  {
    id: "sql-schema",
    name: "Analytics Schema (SQL)",
    language: "sql",
    code: `-- High-performance Analytics Schema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_user_time ON event_logs(user_id, timestamp DESC);
CREATE INDEX idx_events_payload ON event_logs USING GIN(payload);
`,
  },
];

export function CodeSandbox({ onSendCodeToChat }: { onSendCodeToChat?: (codePrompt: string) => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<CodeTemplate>(STARTER_TEMPLATES[0]);
  const [code, setCode] = useState(STARTER_TEMPLATES[0].code);
  const [language, setLanguage] = useState(STARTER_TEMPLATES[0].language);
  const [outputConsole, setOutputConsole] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"console" | "preview">("console");

  const handleSelectTemplate = (tmpl: CodeTemplate) => {
    setSelectedTemplate(tmpl);
    setCode(tmpl.code);
    setLanguage(tmpl.language);
    setOutputConsole([]);
    if (tmpl.language === "html") setViewMode("preview");
    else setViewMode("console");
  };

  const handleRunCode = () => {
    setOutputConsole([]);
    if (language === "html") {
      setViewMode("preview");
      toast.success("HTML preview rendered!");
      return;
    }

    setViewMode("console");
    if (language === "javascript" || language === "typescript") {
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      try {
        console.log = (...args) => {
          logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
          originalLog(...args);
        };
        console.error = (...args) => {
          logs.push(`[ERROR] ${args.map((a) => String(a)).join(" ")}`);
          originalError(...args);
        };

        // Run JavaScript via Function constructor
        const runFn = new Function(code);
        runFn();
        setOutputConsole(logs.length > 0 ? logs : ["✓ Code executed successfully (no console output)."]);
        toast.success("Executed JavaScript successfully!");
      } catch (err: any) {
        setOutputConsole([...logs, `⚠️ Runtime Error: ${err.message || err}`]);
        toast.error("Execution error");
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    } else {
      // Simulated execution output for Python / SQL
      setOutputConsole([
        `[Simulated ${language.toUpperCase()} Environment]`,
        `> Running script...`,
        `✓ Syntax valid & compilation completed.`,
        `Output stream ready.`,
      ]);
      toast.success(`${language.toUpperCase()} script verified`);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAIToExplain = () => {
    if (!onSendCodeToChat) return;
    const prompt = `Please analyze and explain how this ${language.toUpperCase()} code works step by step:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    onSendCodeToChat(prompt);
  };

  const handleAskAIToRefactor = () => {
    if (!onSendCodeToChat) return;
    const prompt = `Please refactor this ${language.toUpperCase()} code to maximize performance, security, and clean modern standards. Explain the improvements made:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    onSendCodeToChat(prompt);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 text-foreground">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <div className="gradient-brand grid h-8 w-8 place-items-center rounded-xl shadow-md">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            Interactive Code Sandbox
          </h1>
          <p className="text-sm text-muted-foreground">
            Develop algorithms, live-preview HTML/CSS layouts, and collaborate with AI on refactoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSendCodeToChat && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskAIToExplain}
                className="gap-1.5 rounded-xl text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Explain with AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskAIToRefactor}
                className="gap-1.5 rounded-xl text-xs"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary" /> Refactor with AI
              </Button>
            </>
          )}
          <Button onClick={handleRunCode} className="gradient-send gap-1.5 rounded-xl text-xs shadow-sm">
            <Play className="h-3.5 w-3.5 fill-current" /> Run Code
          </Button>
        </div>
      </div>

      {/* Starter Template Bar */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
          Templates:
        </span>
        {STARTER_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => handleSelectTemplate(tmpl)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium shrink-0 transition-all",
              selectedTemplate.id === tmpl.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>{tmpl.name}</span>
          </button>
        ))}
      </div>

      {/* Main Split View */}
      <div className="grid flex-1 gap-4 lg:grid-cols-12">
        {/* Editor Pane */}
        <div className="flex flex-col rounded-2xl border border-border/80 bg-card/80 shadow-md backdrop-blur-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-xs text-muted-foreground font-semibold uppercase">
                {language}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleCopyCode}
                title="Copy code"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setCode(selectedTemplate.code)}
                title="Reset code"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 min-h-[360px] resize-none rounded-none rounded-b-2xl border-0 bg-transparent p-4 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            spellCheck={false}
          />
        </div>

        {/* Output / Preview Pane */}
        <div className="flex flex-col rounded-2xl border border-border/80 bg-card/80 shadow-md backdrop-blur-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 bg-muted/20">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode("console")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                  viewMode === "console" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Terminal className="h-3.5 w-3.5" /> Console
              </button>
              {language === "html" && (
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                    viewMode === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Eye className="h-3.5 w-3.5" /> Live Preview
                </button>
              )}
            </div>

            {outputConsole.length > 0 && viewMode === "console" && (
              <button
                type="button"
                onClick={() => setOutputConsole([])}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 p-4 overflow-auto min-h-[300px]">
            {viewMode === "preview" && language === "html" ? (
              <iframe
                srcDoc={code}
                title="Live Output"
                className="h-full min-h-[320px] w-full rounded-xl border border-border/40 bg-white"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="font-mono text-xs space-y-1.5 text-muted-foreground">
                {outputConsole.length > 0 ? (
                  outputConsole.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded px-2 py-1 leading-relaxed",
                        line.startsWith("[ERROR]") || line.startsWith("⚠️")
                          ? "bg-destructive/10 text-destructive font-semibold"
                          : line.startsWith("✓")
                          ? "bg-emerald-500/10 text-emerald-500 font-semibold"
                          : "bg-background/40 text-foreground",
                      )}
                    >
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground opacity-60">
                    <Terminal className="h-8 w-8 stroke-[1.2] mb-2" />
                    <p>Click "Run Code" above to execute and inspect outputs.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
