import { useRef, useEffect } from "react";
import { Sparkles, Cpu, GitMerge, Swords, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedMessage } from "@/components/formatted-message";
import { ModelDropdown } from "@/components/chat/model-dropdown";
import { useAvailableModels, type Thread, type Turn } from "@/hooks/use-threads";
import { cn } from "@/lib/utils";

type CompareViewProps = {
  activeThread: Thread | null;
  models: (string | null)[] ;
  onSelectModelSlot: (slot: number, modelId: string) => void;
  streaming: boolean;
  streamingDeltas: Record<string, string>;
  pendingTurnIds: Set<string>;
  onSynthesize?: (turn: Turn, mode: "synthesis" | "debate") => void;
  onSelectSuggestion?: (promptText: string) => void;
  onOpenSettings?: () => void;
};

const SUGGESTIONS = [
  "Explain quantum computing in simple terms with an analogy",
  "Write a clean TypeScript debounce hook with tests",
  "Compare SQLite vs PostgreSQL for a desktop app",
  "Review this code and identify edge cases or security flaws",
];

export function CompareView({
  activeThread,
  models,
  onSelectModelSlot,
  streaming,
  streamingDeltas,
  pendingTurnIds,
  onSynthesize,
  onSelectSuggestion,
  onOpenSettings,
}: CompareViewProps) {
  const { models: availableModels } = useAvailableModels();

  const leftScrollerRef = useRef<HTMLDivElement>(null);
  const rightScrollerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll both panes when new content arrives
  useEffect(() => {
    if (leftScrollerRef.current) {
      leftScrollerRef.current.scrollTop = leftScrollerRef.current.scrollHeight;
    }
    if (rightScrollerRef.current) {
      rightScrollerRef.current.scrollTop = rightScrollerRef.current.scrollHeight;
    }
  }, [activeThread?.turns.length, streamingDeltas]);

  const modelAId = models[0] ?? availableModels[0]?.id;
  const modelBId = models[1] ?? (availableModels.find((m) => m.id !== modelAId)?.id ?? availableModels[1]?.id ?? modelAId);

  const modelA = availableModels.find((m) => m.id === modelAId) ?? availableModels[0];
  const modelB = availableModels.find((m) => m.id === modelBId) ?? availableModels[1] ?? availableModels[0];

  const getResponseText = (turn: Turn, slot: number) => {
    const live = streamingDeltas[`${turn.id}:${slot}`];
    return turn.responses[String(slot)] || live || "";
  };

  const turns = activeThread?.turns ?? [];
  const hasTurns = turns.length > 0;
  const lastTurn = turns[turns.length - 1];
  const canSynthesize =
    hasTurns &&
    !streaming &&
    Boolean(getResponseText(lastTurn, 0)?.trim()) &&
    Boolean(getResponseText(lastTurn, 1)?.trim());

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden bg-background">
      {/* Compare Mode Notice / Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-1.5 backdrop-blur-xs text-xs">
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-foreground font-semibold">Side-by-Side Model Comparison</span>
          <span className="hidden sm:inline text-muted-foreground">· Prompts sent to both models simultaneously</span>
        </div>
        {canSynthesize && onSynthesize && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSynthesize(lastTurn, "synthesis")}
              className="h-7 gap-1 rounded-lg border-primary/30 bg-primary/10 px-2 text-[11px] font-semibold text-primary hover:bg-primary/20"
            >
              <GitMerge className="h-3 w-3" />
              <span>Synthesize</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSynthesize(lastTurn, "debate")}
              className="h-7 gap-1 rounded-lg border-amber-500/30 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-500 hover:bg-amber-500/20"
            >
              <Swords className="h-3 w-3" />
              <span>Debate</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Split Screen Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60 min-h-0 overflow-hidden">
        {/* Left Side: Model A */}
        <div className="flex flex-col min-h-0 h-full overflow-hidden bg-background/50">
          {/* Left Column Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-card/70 px-3 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <ModelDropdown
                selectedModelId={modelAId}
                onSelectModel={(id) => onSelectModelSlot(0, id)}
                onOpenSettings={onOpenSettings}
                label="Model A"
                badgeClass="bg-primary/15 text-primary border border-primary/25"
              />
            </div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
              Side 1
            </span>
          </div>

          {/* Left Column Chat Scroller */}
          <div
            ref={leftScrollerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 scrollbar-thin"
          >
            {!hasTurns ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
                  <Cpu className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-semibold text-foreground">
                    {modelA?.label ?? "Model A"}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Left pane model ready. Any prompt you type below will be executed here in parallel with Model B.
                  </p>
                </div>
                {onSelectSuggestion && (
                  <div className="w-full max-w-sm space-y-2 pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block text-left">
                      Try a prompt
                    </span>
                    {SUGGESTIONS.slice(0, 2).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => onSelectSuggestion(prompt)}
                        className="w-full text-left rounded-xl border border-border/70 bg-card/60 p-2.5 text-xs text-foreground transition hover:border-primary/40 hover:bg-card hover:shadow-xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              turns.map((turn, index) => {
                const text = getResponseText(turn, 0);
                const isPending = pendingTurnIds.has(turn.id) || (streaming && !text);

                return (
                  <div key={`${turn.id}-slot0`} className="space-y-3">
                    {/* User Prompt */}
                    <div className="flex items-start justify-end">
                      <div className="max-w-[85%] rounded-2xl border border-primary/15 bg-primary/10 px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-xs">
                        {turn.prompt}
                      </div>
                    </div>

                    {/* Model A Response Card */}
                    <article className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-xs transition hover:shadow-md">
                      <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Cpu className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold">{modelA?.label ?? "Model A"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Turn #{index + 1}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm leading-relaxed text-foreground">
                        {text ? (
                          <FormattedMessage text={text} />
                        ) : isPending ? (
                          <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                            <span>Thinking and generating response...</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </article>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Model B */}
        <div className="flex flex-col min-h-0 h-full overflow-hidden bg-background/50">
          {/* Right Column Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-card/70 px-3 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <ModelDropdown
                selectedModelId={modelBId}
                onSelectModel={(id) => onSelectModelSlot(1, id)}
                onOpenSettings={onOpenSettings}
                label="Model B"
                badgeClass="bg-emerald-500/15 text-emerald-500 border border-emerald-500/25"
              />
            </div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
              Side 2
            </span>
          </div>

          {/* Right Column Chat Scroller */}
          <div
            ref={rightScrollerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 scrollbar-thin"
          >
            {!hasTurns ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-xs">
                  <Cpu className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-semibold text-foreground">
                    {modelB?.label ?? "Model B"}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Right pane model ready. Compare its response quality, tone, and logic directly side-by-side with Model A.
                  </p>
                </div>
                {onSelectSuggestion && (
                  <div className="w-full max-w-sm space-y-2 pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block text-left">
                      Try a prompt
                    </span>
                    {SUGGESTIONS.slice(2, 4).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => onSelectSuggestion(prompt)}
                        className="w-full text-left rounded-xl border border-border/70 bg-card/60 p-2.5 text-xs text-foreground transition hover:border-emerald-500/40 hover:bg-card hover:shadow-xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              turns.map((turn, index) => {
                const text = getResponseText(turn, 1);
                const isPending = pendingTurnIds.has(turn.id) || (streaming && !text);

                return (
                  <div key={`${turn.id}-slot1`} className="space-y-3">
                    {/* User Prompt */}
                    <div className="flex items-start justify-end">
                      <div className="max-w-[85%] rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-xs">
                        {turn.prompt}
                      </div>
                    </div>

                    {/* Model B Response Card */}
                    <article className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-xs transition hover:shadow-md">
                      <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Cpu className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">{modelB?.label ?? "Model B"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Turn #{index + 1}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm leading-relaxed text-foreground">
                        {text ? (
                          <FormattedMessage text={text} />
                        ) : isPending ? (
                          <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Thinking and generating response...</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </article>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
