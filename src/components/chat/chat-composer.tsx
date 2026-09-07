import { useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Send, Paperclip, X, FileText, Image as ImageIcon, File, Square, Sparkles, Cpu, ChevronDown, Check } from "lucide-react";
import { GoogleDrive } from "@/components/lazy-google-drive";
import { EmailTool } from "@/components/lazy-email-tool";
import { VoiceTool } from "@/components/lazy-voice-tool";
import { useAvailableModels, type Attachment } from "@/hooks/use-threads";
import { PROVIDER_LABELS } from "@/lib/models";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  input: string;
  setInput: (val: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  streaming: boolean;
  onSend: () => void;
  onStop?: () => void;
  activeThread: boolean;
  selectedModelId?: string | null;
  onSelectModel?: (modelId: string) => void;
  compareMode?: boolean;
};

export function ChatComposer({
  input,
  setInput,
  attachments,
  setAttachments,
  streaming,
  onSend,
  onStop,
  activeThread,
  selectedModelId,
  onSelectModel,
  compareMode = false,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { models: availableModels } = useAvailableModels();

  const currentModel = availableModels.find((m) => m.id === selectedModelId) ?? availableModels[0];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFilesSelected(imageFiles);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    files.forEach((file) => {
      const id = crypto.randomUUID();
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            { id, name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      } else if (isTextFile(file)) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            { id, name: file.name, type: file.type, size: file.size, textContent: reader.result as string },
          ]);
        };
        reader.readAsText(file);
      } else {
        setAttachments((prev) => [...prev, { id, name: file.name, type: file.type, size: file.size }]);
      }
    });
  };

  function isTextFile(file: File): boolean {
    if (file.type.startsWith("text/")) return true;
    const textMimes = new Set([
      "application/json",
      "application/xml",
      "application/javascript",
      "application/typescript",
      "application/x-yaml",
      "application/yaml",
      "application/csv",
      "application/sql",
      "application/x-sh",
      "application/x-python",
      "application/pdf",
    ]);
    if (textMimes.has(file.type)) return true;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const textExts = new Set([
      "txt", "md", "markdown", "csv", "json", "xml", "yaml", "yml",
      "js", "ts", "tsx", "jsx", "html", "htm", "css", "scss", "less",
      "py", "rb", "go", "java", "c", "cpp", "h", "rs", "sh", "bash",
      "sql", "graphql", "gql", "toml", "ini", "env", "log", "pdf",
    ]);
    return textExts.has(ext);
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput(input + (input ? " " : "") + transcript);
  };

  return (
    <div className="bg-transparent p-3 sm:p-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 rounded-[30px] border border-border/60 bg-card/65 dark:bg-zinc-800/85 dark:border-zinc-700/80 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-lg sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          {/* Top Bar inside Composer: Model Selector (hidden in Compare Mode since each pane has its own dropdown) */}
          {!compareMode && (
            <div className="flex items-center justify-between px-2 pt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 dark:bg-zinc-700/80 dark:border-zinc-600/60 px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition shadow-xs cursor-pointer"
                  >
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    <span>{currentModel?.label ?? "Select Model"}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5 shadow-xl">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available AI Models
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {availableModels.map((m) => {
                      const isSelected = m.id === (selectedModelId ?? availableModels[0]?.id);
                      return (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={() => onSelectModel?.(m.id)}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors",
                            isSelected ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-accent",
                          )}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="truncate">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                              {PROVIDER_LABELS[m.provider ?? "openai"] || m.provider}
                            </span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="inline-flex max-w-[200px] items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-xs text-foreground backdrop-blur-sm dark:bg-white/5"
                >
                  {a.dataUrl ? (
                    <img src={a.dataUrl} alt={a.name} className="h-5 w-5 rounded object-cover" />
                  ) : (
                    <span className="text-muted-foreground">
                      {a.type.startsWith("image/") ? (
                        <ImageIcon className="h-3.5 w-3.5" />
                      ) : a.type === "application/pdf" ? (
                        <FileText className="h-3.5 w-3.5" />
                      ) : (
                        <File className="h-3.5 w-3.5" />
                      )}
                    </span>
                  )}
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                    aria-label={`Remove ${a.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              handleFilesSelected(files);
            }}
          />

          {/* Input Row */}
          <div className="relative flex w-full items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 dark:bg-zinc-700/80 dark:border-zinc-600/60 text-muted-foreground shadow-sm transition hover:border-primary hover:text-foreground"
                  aria-label="Open composer actions"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start" className="min-w-[260px] rounded-3xl border border-border bg-card p-3 shadow-xl">
                <div className="grid gap-2">
                  <DropdownMenuItem
                    onSelect={() => fileInputRef.current?.click()}
                    className="justify-start gap-2 px-2 text-sm"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach Files
                  </DropdownMenuItem>
                  <Suspense fallback={<div className="px-2 text-xs text-muted-foreground">Loading Google Drive...</div>}>
                    <GoogleDrive
                      className="justify-start gap-2 px-2 text-sm"
                      onFileSelect={(file) => console.log("Drive file:", file)}
                    />
                  </Suspense>
                  <Suspense fallback={<div className="px-2 text-xs text-muted-foreground">Loading Email Tool...</div>}>
                    <EmailTool
                      className="justify-start gap-2 px-2 text-sm"
                      onSendEmail={(email) => console.log("Send email:", email)}
                    />
                  </Suspense>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                compareMode
                  ? "Ask both models simultaneously…"
                  : activeThread
                    ? "Follow up…"
                    : "Ask anything…"
              }
              rows={1}
              className="min-h-[54px] w-full rounded-full border-0 bg-transparent px-14 py-3 pr-32 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
            />
            <VoiceTool
              compact
              className="absolute right-14 top-1/2 z-10 -translate-y-1/2"
              onTranscript={handleVoiceTranscript}
            />
            
            {streaming ? (
              <Button
                size="icon"
                onClick={onStop}
                className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                aria-label="Stop generation"
                title="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={onSend}
                disabled={!input.trim() && attachments.length === 0}
                className="gradient-send absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="mx-auto mt-2 w-full text-center text-xs text-muted-foreground/60">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
