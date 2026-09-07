import { useRef, useEffect, useState } from "react";
import { Sparkles, Pencil, FileText, Image as ImageIcon, File, GitMerge, Swords, Cpu, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormattedMessage } from "@/components/formatted-message";
import { useAvailableModels, type Attachment, type Thread, type Turn } from "@/hooks/use-threads";
import { cn } from "@/lib/utils";

type MessageThreadProps = {
  activeThread: Thread | null;
  streaming: boolean;
  streamingDeltas: Record<string, string>;
  pendingTurnIds: Set<string>;
  onRegenerate: (turnId: string, newText: string) => void;
  onSuggestionClick: (promptText: string) => void;
  onSynthesize?: (turn: Turn, mode: "synthesis" | "debate") => void;
};

export function MessageThread({
  activeThread,
  streaming,
  streamingDeltas,
  pendingTurnIds,
  onRegenerate,
  onSuggestionClick,
  onSynthesize,
}: MessageThreadProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState("");
  const { models: availableModels } = useAvailableModels();

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeThread?.turns.length, streamingDeltas]);

  const renderResponseText = (turn: Turn, slot: number) => {
    const live = streamingDeltas[`${turn.id}:${slot}`];
    return turn.responses[String(slot)] || live || "";
  };

  if (!activeThread || activeThread.turns.length === 0) {
    return <EmptyState onSelectSuggestion={onSuggestionClick} />;
  }

  return (
    <div ref={scrollerRef} className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {activeThread.turns.map((turn) => (
          <div key={turn.id} className="space-y-4">
            {/* User message */}
            <div className="group flex items-start justify-end gap-2">
              {editingTurnId !== turn.id && (
                <button
                  onClick={() => {
                    setEditingTurnId(turn.id);
                    setEditingPromptText(turn.prompt);
                  }}
                  className="mt-2 hidden rounded-lg border border-border bg-card/80 p-1 text-muted-foreground shadow-sm transition hover:text-foreground group-hover:flex"
                  title="Edit prompt and regenerate"
                  aria-label="Edit prompt"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}

              {editingTurnId === turn.id ? (
                <div className="w-full max-w-[85%] space-y-2 rounded-2xl border border-primary/25 bg-card p-3 shadow-lg shadow-primary/5">
                  <Label className="text-xs font-semibold">Edit Prompt & Regenerate</Label>
                  <Textarea
                    value={editingPromptText}
                    onChange={(e) => setEditingPromptText(e.target.value)}
                    className="min-h-[70px] text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                            setEditingTurnId(null);
                        setEditingPromptText("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        if (!editingPromptText.trim()) return;
                            onRegenerate(turn.id, editingPromptText.trim());
                        setEditingTurnId(null);
                        setEditingPromptText("");
                      }}
                    >
                      Save & Regenerate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="max-w-[78%] rounded-2xl border border-primary/10 bg-primary/10 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm">
                  {turn.prompt}
                  {turn.attachments && turn.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {turn.attachments.map((a) => (
                        <AttachmentChip key={a.id} attachment={a} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Model responses */}
            <TurnResponses
              turn={turn}
              activeThread={activeThread}
              availableModels={availableModels}
              streaming={streaming || pendingTurnIds.has(turn.id)}
              getText={renderResponseText}
              onSynthesize={onSynthesize}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const SLOT_ACCENT = ["card-accent-a", "card-accent-b"] as const;

function TurnResponses({
  turn,
  activeThread,
  availableModels,
  streaming,
  getText,
  onSynthesize,
}: {
  turn: Turn;
  activeThread: Thread;
  availableModels: { id: string; label: string; provider?: string }[];
  streaming: boolean;
  getText: (turn: Turn, slot: number) => string;
  onSynthesize?: (turn: Turn, mode: "synthesis" | "debate") => void;
}) {
  const hasMultipleOutputs = turn.targets.length > 1;
  const isAllStreamed = !streaming && turn.targets.every((s) => Boolean(getText(turn, s)?.trim()));

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-4", hasMultipleOutputs ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        {turn.targets.map((slot) => {
          const text = getText(turn, slot);
          const accentClass = SLOT_ACCENT[slot % 2];
          const modelId = activeThread.models[slot] ?? availableModels[slot]?.id;
          const model = availableModels.find((m) => m.id === modelId);

          return (
            <article
              key={slot}
              className={cn(
                "rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm transition-all hover:shadow-md backdrop-blur-xs flex flex-col justify-between",
                accentClass,
              )}
            >
              {/* Card Model Header badge */}
              {hasMultipleOutputs && (
                <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    <span>{model?.label ?? `Model ${slot + 1}`}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    Slot {slot + 1}
                  </span>
                </div>
              )}

              <div className="text-sm leading-7 text-foreground">
                {text ? (
                  <FormattedMessage text={text} />
                ) : streaming ? (
                  <span className="inline-flex gap-1 text-muted-foreground py-2">
                    <Dot delay={0} />
                    <Dot delay={150} />
                    <Dot delay={300} />
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Debate & Consensus Action Pills (only shown on multi-model turns) */}
      {hasMultipleOutputs && isAllStreamed && onSynthesize && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onSynthesize(turn, "synthesis");
            }}
            className="h-8 gap-1.5 rounded-xl border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 shadow-xs transition"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>⚡ Synthesize Best of Both</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onSynthesize(turn, "debate");
            }}
            className="h-8 gap-1.5 rounded-xl border-border/70 bg-card/70 text-xs font-semibold text-foreground hover:bg-accent shadow-xs transition"
          >
            <Swords className="h-3.5 w-3.5 text-amber-500" />
            <span>⚔️ Run AI Debate</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const icon = attachment.type.startsWith("image/") ? (
    <ImageIcon className="h-3.5 w-3.5" />
  ) : attachment.type === "application/pdf" ? (
    <FileText className="h-3.5 w-3.5" />
  ) : (
    <File className="h-3.5 w-3.5" />
  );

  return (
    <div className="inline-flex max-w-[200px] items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-xs text-foreground backdrop-blur-sm dark:bg-white/5">
      {attachment.dataUrl ? (
        <img src={attachment.dataUrl} alt={attachment.name} className="h-5 w-5 rounded object-cover" />
      ) : (
        <span className="text-muted-foreground">{icon}</span>
      )}
      <span className="truncate">{attachment.name}</span>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-primary/70 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function EmptyState({ onSelectSuggestion }: { onSelectSuggestion: (text: string) => void }) {
  const suggestions = [
    "Plan a launch strategy for my product",
    "Build a responsive glassmorphism card in Tailwind",
    "Draft a professional email reply",
    "Compare PostgreSQL vs SQLite for an edge app",
  ];

  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="mx-auto mb-8 flex w-fit items-center gap-3 rounded-full border border-border/70 bg-card/70 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="gradient-brand grid h-8 w-8 place-items-center rounded-full shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">Mena</span>
        </div>

        <div className="space-y-4 text-center">
          <h1 className="gradient-text text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            How can I help today?
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Chat, code, create with multiple AI models, and explore interactive artifacts in real time.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                onSelectSuggestion(prompt);
              }}
              className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-left text-sm text-foreground shadow-sm transition hover:border-primary/40 hover:bg-card hover:shadow-md active:scale-[0.99]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
