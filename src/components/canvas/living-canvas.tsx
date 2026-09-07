import { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Play,
  Code2,
  Eye,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type CanvasArtifact = {
  id: string;
  title: string;
  language: string;
  code: string;
};

type LivingCanvasProps = {
  artifact: CanvasArtifact | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSandbox?: (code: string) => void;
};

type ViewportMode = "desktop" | "tablet" | "mobile";

export function LivingCanvas({
  artifact,
  isOpen,
  onClose,
  onOpenSandbox,
}: LivingCanvasProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [editableCode, setEditableCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (artifact) {
      setEditableCode(artifact.code);
      setActiveTab("preview");

    }
  }, [artifact?.id, artifact?.code]);

  if (!isOpen || !artifact) return null;

  const lang = (artifact.language || "").toLowerCase();
  const isSvg = lang === "svg" || editableCode.trim().startsWith("<svg");
  const isHtml =
    lang === "html" ||
    lang === "htm" ||
    editableCode.includes("<!DOCTYPE") ||
    editableCode.includes("<html") ||
    editableCode.includes("<div");

  // Construct srcDoc for preview with Tailwind CSS CDN for instant modern component rendering
  const previewDoc = useMemo(() => {
    if (isSvg) {
      return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #090a0f; }
      svg { max-width: 90vw; max-height: 90vh; }
    </style>
  </head>
  <body>
    ${editableCode}
  </body>
</html>`;
    }

    if (isHtml) {
      // If code doesn't have <html> structure, wrap it cleanly with Tailwind CSS
      if (!editableCode.includes("<html")) {
        return `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              primary: '#8b5cf6',
              brand: { 50: '#f5f3ff', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' }
            }
          }
        }
      }
    </script>
    <style>
      body { margin: 0; padding: 1.5rem; background-color: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    ${editableCode}
  </body>
</html>`;
      }
      return editableCode;
    }

    // Default code fallback preview (JSON / Markdown / Plaintext)
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { margin: 0; padding: 1.5rem; font-family: monospace; background: #0f172a; color: #38bdf8; white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>${editableCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
</html>`;
  }, [editableCode, isSvg, isHtml]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableCode);

    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {

    const extension = isSvg
      ? "svg"
      : isHtml
        ? "html"
        : lang === "json"
          ? "json"
          : lang === "typescript" || lang === "tsx"
            ? "tsx"
            : lang === "javascript" || lang === "jsx"
              ? "jsx"
              : "txt";

    const blob = new Blob([editableCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "artifact"}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as .${extension}`);
  };

  const viewportWidthClass = {
    desktop: "w-full",
    tablet: "w-[768px] mx-auto shadow-2xl border-x border-border/50",
    mobile: "w-[375px] mx-auto shadow-2xl border-x border-border/50 rounded-b-2xl",
  }[viewport];

  return (
    <aside
      className={cn(
        "flex flex-col border-l border-border/70 bg-card/95 backdrop-blur-md transition-all duration-300 z-30 shadow-2xl",
        isFullscreen
          ? "fixed inset-0 z-50 w-full h-full"
          : "fixed top-0 right-0 bottom-0 w-full sm:w-[540px] md:w-[640px] lg:w-[720px]",
      )}
    >
      {/* Canvas Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground truncate">
              {artifact.title || "Interactive Artifact"}
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {artifact.language || "HTML / Component"}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Tab Switcher */}
          <div className="flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/40 mr-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("preview");

              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                activeTab === "preview"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("code");

              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                activeTab === "code"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Code</span>
            </button>
          </div>

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>

          {/* Download Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
            title="Download source file"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          {/* Open in CodeSandbox Workspace */}
          {onOpenSandbox && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => {

                onOpenSandbox(editableCode);
                toast.success("Opened in Code Sandbox workspace");
              }}
              title="Open in Code Sandbox workspace"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => {

              setIsFullscreen(!isFullscreen);
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Close Canvas */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground ml-1"
            onClick={() => {

              onClose();
            }}
            title="Close Canvas"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sub-bar for Preview Mode: Responsive Device Switcher & Refresh */}
      {activeTab === "preview" && (
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {

                setViewport("desktop");
              }}
              className={cn(
                "rounded-md p-1 transition",
                viewport === "desktop" ? "bg-card text-primary shadow-xs" : "hover:text-foreground",
              )}
              title="Desktop view"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {

                setViewport("tablet");
              }}
              className={cn(
                "rounded-md p-1 transition",
                viewport === "tablet" ? "bg-card text-primary shadow-xs" : "hover:text-foreground",
              )}
              title="Tablet view (768px)"
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {

                setViewport("mobile");
              }}
              className={cn(
                "rounded-md p-1 transition",
                viewport === "mobile" ? "bg-card text-primary shadow-xs" : "hover:text-foreground",
              )}
              title="Mobile view (375px)"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {

              setRefreshKey((k) => k + 1);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
            title="Reload preview"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reload</span>
          </button>
        </div>
      )}

      {/* Canvas Body */}
      <div className="relative flex-1 overflow-hidden bg-slate-950/40">
        {activeTab === "preview" ? (
          <div className="h-full w-full overflow-auto bg-slate-950/60 p-4 flex items-center justify-center">
            <iframe
              key={refreshKey}
              title="Living Canvas Sandbox"
              srcDoc={previewDoc}
              className={cn("h-full rounded-xl border-0 bg-background transition-all", viewportWidthClass)}
              sandbox="allow-scripts allow-modals"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-border/40 bg-muted/10 px-4 py-1.5 text-[11px] text-muted-foreground">
              💡 Live editor: edit any lines below and switch back to <strong>Preview</strong> to see changes immediately.
            </div>
            <textarea
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              className="flex-1 resize-none bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none select-text focus:ring-0"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
