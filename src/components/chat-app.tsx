import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useAvailableModels, useThreads, isCompareThread, type Attachment, type Thread, type Turn } from "@/hooks/use-threads";
import { buildHistoryForSlot, streamCompletion } from "@/lib/stream-chat";
import { buildSynthesisPrompt, buildDebatePrompt } from "@/lib/consensus-engine";

import { Sidebar } from "@/components/chat/sidebar";
import { TopBar } from "@/components/chat/desktop-top-bar";
import { MessageThread } from "@/components/chat/message-thread";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ThreadDialogs } from "@/components/chat/thread-dialogs";
import { LivingCanvas, type CanvasArtifact } from "@/components/canvas/living-canvas";
import { CompareView } from "@/components/chat/compare-view";

import { ImageStudio } from "@/components/workspaces/image-studio";
import { PromptLibrary } from "@/components/workspaces/prompt-library";
import { PluginHub } from "@/components/workspaces/plugin-hub";
import { CodeSandbox } from "@/components/workspaces/code-sandbox";
import { WorkspaceUtilities } from "@/components/workspaces/workspace-utilities";
import { cn } from "@/lib/utils";

type ChatAppProps = { threadId?: string };
type WorkspaceMode = "chat" | "images" | "library" | "plugins" | "code" | "more";

export function ChatApp({ threadId }: ChatAppProps) {
  const navigate = useNavigate();
  const { models: availableModels } = useAvailableModels();
  const { threads, createThread, updateThread, deleteThread, markTurnPending, clearTurnPending, pendingTurnIds } =
    useThreads();

  // Active Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceMode>("chat");

  // Living Canvas state
  const [canvasArtifact, setCanvasArtifact] = useState<CanvasArtifact | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);

  // Compare Models mode switch (default: false as requested)
  const [compareMode, setCompareMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("mena:compare_mode") === "true" ||
        localStorage.getItem("mena:consensus_mode") === "true"
      );
    }
    return false;
  });

  const handleToggleCompareMode = () => {
    const next = !compareMode;
    setCompareMode(next);
    localStorage.setItem("mena:compare_mode", String(next));
    localStorage.setItem("mena:consensus_mode", String(next));
    if (next) {
      // Ensure model slot 1 has a model selected
      setModels((prev) => {
        const primary = prev[0] ?? availableModels[0]?.id ?? null;
        let secondary = prev[1];
        if (!secondary) {
          const alternate = availableModels.find((m) => m.id !== primary);
          secondary = alternate?.id ?? availableModels[1]?.id ?? primary;
        }
        const updated = [primary, secondary];
        if (activeThread) {
          updateThread(activeThread.id, (t) => ({ ...t, models: updated }));
        }
        return updated;
      });
      toast.info("Compare Mode activated: Split screen enabled with two models.", { duration: 1400 });
    } else {
      toast.info("Compare Mode disabled.", { duration: 1400 });
    }
  };

  // When threadId changes, automatically switch to chat view
  useEffect(() => {
    if (threadId) {
      setActiveWorkspace("chat");
    }
  }, [threadId]);

  // Dialog states
  const [renameThread, setRenameThread] = useState<Thread | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [shareThread, setShareThread] = useState<Thread | null>(null);
  const [moveThread, setMoveThread] = useState<Thread | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [customProject, setCustomProject] = useState("");

  const activeThread = useMemo(
    () => (threadId ? threads.find((t) => t.id === threadId) ?? null : null),
    [threads, threadId],
  );

  // Sync compare mode and models when selecting an active thread
  useEffect(() => {
    if (activeThread) {
      const isCompare = isCompareThread(activeThread);
      setCompareMode(isCompare);
      localStorage.setItem("mena:compare_mode", String(isCompare));
      if (activeThread.models && activeThread.models.some(Boolean)) {
        setModels(activeThread.models);
      }
    }
  }, [activeThread]);

  const existingProjects = useMemo(() => {
    const set = new Set<string>();
    threads.forEach((t) => {
      if (t.project?.trim()) set.add(t.project.trim());
    });
    return Array.from(set);
  }, [threads]);

  // Composer states
  const [models, setModels] = useState<(string | null)[]>(
    () => activeThread?.models ?? [availableModels[0]?.id ?? null, null],
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingDeltas, setStreamingDeltas] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sidebar resize states
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const isResizing = useRef(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const startResize = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResize = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const min = 200;
    const max = Math.min(480, window.innerWidth * 0.45);
    const next = Math.max(min, Math.min(max, e.clientX));
    setSidebarWidth(next);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [resize, stopResize]);

  // Accent color initialization
  useEffect(() => {
    const savedAccent = localStorage.getItem("mena_accent_color");
    if (savedAccent) {
      document.documentElement.setAttribute("data-accent", savedAccent);
    }
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreaming(false);
      toast.info("Generation stopped");
    }
  };

  const handleSynthesize = async (turn: Turn, mode: "synthesis" | "debate") => {
    if (!activeThread) return;
    const modelOutputs = turn.targets
      .map((slot) => {
        const text = turn.responses[String(slot)] || "";
        const modelId = activeThread.models[slot] ?? availableModels[slot]?.id;
        const model = availableModels.find((m) => m.id === modelId);
        return {
          modelName: model?.label || `Model ${slot + 1}`,
          text,
        };
      })
      .filter((m) => m.text.trim().length > 0);

    if (modelOutputs.length < 2) {
      toast.error("At least two model responses are needed for consensus synthesis.");
      return;
    }

    const promptText =
      mode === "synthesis"
        ? buildSynthesisPrompt(turn.prompt, modelOutputs)
        : buildDebatePrompt(turn.prompt, modelOutputs);

    const displayTitle =
      mode === "synthesis"
        ? `⚡ Consensus Synthesis: "${turn.prompt.slice(0, 32)}..."`
        : `⚔️ AI Debate Verdict: "${turn.prompt.slice(0, 32)}..."`;

    const synthTurnId = crypto.randomUUID();
    const synthSlot = 0;

    const newTurn: Turn = {
      id: synthTurnId,
      prompt: displayTitle,
      attachments: [],
      targets: [synthSlot],
      responses: { [String(synthSlot)]: "" },
    };

    updateThread(activeThread.id, (t) => ({
      ...t,
      turns: [...t.turns, newTurn],
    }));

    setStreaming(true);
    markTurnPending(synthTurnId);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const primaryModelId = activeThread.models[synthSlot] || availableModels[0]?.id;
    const entry = availableModels.find((m) => m.id === primaryModelId);
    const apiKey = entry?.apiKey;
    const baseUrl = entry?.baseUrl;
    const provider = entry?.provider;

    const history: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: promptText },
    ];

    try {
      const full = await streamCompletion(
        primaryModelId,
        history,
        (chunk) => {
          setStreamingDeltas((prev) => ({
            ...prev,
            [`${synthTurnId}:${synthSlot}`]: (prev[`${synthTurnId}:${synthSlot}`] ?? "") + chunk,
          }));
        },
        { apiKey, baseUrl, provider, signal: controller.signal },
      );

      updateThread(activeThread.id, (t) => ({
        ...t,
        turns: t.turns.map((tn) =>
          tn.id === synthTurnId ? { ...tn, responses: { [String(synthSlot)]: full } } : tn,
        ),
      }));
    } catch (err) {
      if (!controller.signal.aborted) {
        toast.error(`Synthesis failed: ${err instanceof Error ? err.message : "Error"}`);
      }
    } finally {
      clearTurnPending(synthTurnId);
      setStreaming(false);
      setStreamingDeltas({});
      abortControllerRef.current = null;
    }
  };

  const handleSendPrompt = async (promptTextText?: string) => {
    const text = (promptTextText ?? input).trim();
    if (!text && attachments.length === 0) return;

    // In compare mode, target both slots; in standard mode, target slot 0
    let effectiveModels = models;
    if (compareMode && !effectiveModels[1]) {
      const alt = availableModels.find((m) => m.id !== effectiveModels[0])?.id ?? availableModels[1]?.id ?? effectiveModels[0];
      effectiveModels = [effectiveModels[0], alt];
      setModels(effectiveModels);
    }
    const targets = compareMode
      ? (effectiveModels.map((m, i) => (m ? i : -1)).filter((i) => i >= 0) as number[])
      : [0];

    if (targets.length === 0) {
      toast.error("Add a model in Settings to get a response.");
      return;
    }

    let thread: Thread;
    if (!activeThread) {
      thread = createThread({ models: effectiveModels, isCompare: compareMode });
      navigate({ to: "/$threadId", params: { threadId: thread.id } });
    } else {
      thread = activeThread;
    }

    const turnId = crypto.randomUUID();
    const currentAttachments = attachments;
    const newTurn: Turn = {
      id: turnId,
      prompt: text,
      attachments: currentAttachments,
      targets,
      responses: Object.fromEntries(targets.map((s) => [String(s), ""])),
    };

    updateThread(thread.id, (t) => ({
      ...t,
      title: t.turns.length === 0 ? (text || attachments[0]?.name || "New chat").slice(0, 48) : t.title,
      isCompare: compareMode || t.isCompare,
      turns: [...t.turns, newTurn],
    }));

    setInput("");
    setAttachments([]);
    setStreaming(true);
    markTurnPending(turnId);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const deltaKey = (slot: number) => `${turnId}:${slot}`;
    setStreamingDeltas((prev) => {
      const next = { ...prev };
      targets.forEach((s) => (next[deltaKey(s)] = ""));
      return next;
    });

    const results: Record<number, string> = {};

    await Promise.all(
      targets.map(async (slot) => {
        const modelId = models[slot]!;
        const entry = availableModels.find((m) => m.id === modelId);
        const apiKey = entry?.apiKey;
        const baseUrl = entry?.baseUrl;
        const provider = entry?.provider;
        const history = buildHistoryForSlot(thread.turns, slot, text, currentAttachments);
        try {
          const full = await streamCompletion(
            modelId,
            history,
            (chunk) => {
              setStreamingDeltas((prev) => ({
                ...prev,
                [deltaKey(slot)]: (prev[deltaKey(slot)] ?? "") + chunk,
              }));
            },
            { apiKey, baseUrl, provider, signal: controller.signal },
          );
          results[slot] = full;
          updateThread(thread.id, (t) => ({
            ...t,
            turns: t.turns.map((tn) =>
              tn.id === turnId
                ? { ...tn, responses: { ...tn.responses, [String(slot)]: full } }
                : tn,
            ),
          }));
        } catch (err) {
          if (controller.signal.aborted) return;
          const msg = err instanceof Error ? err.message : "Error";
          results[slot] = `⚠️ ${msg}`;
          updateThread(thread.id, (t) => ({
            ...t,
            turns: t.turns.map((tn) =>
              tn.id === turnId
                ? { ...tn, responses: { ...tn.responses, [String(slot)]: `⚠️ ${msg}` } }
                : tn,
            ),
          }));
        }
      }),
    );

    clearTurnPending(turnId);
    setStreaming(false);
    setStreamingDeltas({});
    abortControllerRef.current = null;
  };

  const handleRegenerate = async (turnId: string, editedText: string) => {
    if (!activeThread) return;
    const turnIndex = activeThread.turns.findIndex((t) => t.id === turnId);
    if (turnIndex === -1) return;
    const turn = activeThread.turns[turnIndex];

    const updatedTurns = activeThread.turns.slice(0, turnIndex + 1).map((t) =>
      t.id === turnId ? { ...t, prompt: editedText, responses: {} } : t,
    );

    updateThread(activeThread.id, (prev) => ({
      ...prev,
      turns: updatedTurns,
    }));

    markTurnPending(turnId);
    setStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const slotsToStream = turn.targets.length > 0 ? turn.targets : [0];
    await Promise.all(
      slotsToStream.map(async (slot) => {
        const modelId = activeThread.models[slot] ?? availableModels[0]?.id;
        if (!modelId) return;
        const entry = availableModels.find((m) => m.id === modelId);
        const apiKey = entry?.apiKey;
        const baseUrl = entry?.baseUrl;
        const provider = entry?.provider;
        const history = buildHistoryForSlot(updatedTurns.slice(0, turnIndex), slot, editedText);

        try {
          let accumulated = "";
          await streamCompletion(
            modelId,
            history,
            (chunk) => {
              accumulated += chunk;
              setStreamingDeltas((prev) => ({
                ...prev,
                [`${turnId}:${slot}`]: accumulated,
              }));
            },
            { apiKey, baseUrl, provider, signal: controller.signal },
          );

          updateThread(activeThread.id, (t) => ({
            ...t,
            turns: t.turns.map((tn) =>
              tn.id === turnId
                ? { ...tn, responses: { ...tn.responses, [String(slot)]: accumulated } }
                : tn,
            ),
          }));
        } catch (err) {
          if (!controller.signal.aborted) {
            toast.error(`Regeneration error: ${err instanceof Error ? err.message : "Failed"}`);
          }
        }
      }),
    );

    clearTurnPending(turnId);
    setStreaming(false);
    setStreamingDeltas({});
    abortControllerRef.current = null;
  };

  const handleSelectModel = (modelId: string) => {
    setModels((prev) => [modelId, prev[1] ?? null]);
    if (activeThread) {
      updateThread(activeThread.id, (t) => ({
        ...t,
        models: [modelId, t.models[1] ?? null],
      }));
    }
  };

  const handleSelectModelSlot = (slot: number, modelId: string) => {
    setModels((prev) => {
      const next = [...prev];
      next[slot] = modelId;
      if (activeThread) {
        updateThread(activeThread.id, (t) => {
          const updatedModels = [...(t.models || [])];
          updatedModels[slot] = modelId;
          return { ...t, models: updatedModels };
        });
      }
      return next;
    });
  };

  const handleExportChat = (format: "markdown" | "json") => {
    if (!activeThread) return;
    if (format === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeThread, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${activeThread.title || "chat"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      let md = `# ${activeThread.title || "Chat Export"}\n\n`;
      activeThread.turns.forEach((turn, i) => {
        md += `### User\n${turn.prompt}\n\n`;
        turn.targets.forEach((slot) => {
          const resp = turn.responses[String(slot)];
          if (resp) {
            const mId = activeThread.models[slot];
            const mLabel = availableModels.find((m) => m.id === mId)?.label || `Model ${slot + 1}`;
            md += `### ${mLabel}\n${resp}\n\n`;
          }
        });
        md += `---\n\n`;
      });
      const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${activeThread.title || "chat"}.md`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
    toast.success(`Exported chat as ${format.toUpperCase()}`);
  };

  // Model-responsive ambient provider hue
  const activeProvider = useMemo(() => {
    const primaryId = models[0] || availableModels[0]?.id;
    return availableModels.find((m) => m.id === primaryId)?.provider ?? "openai";
  }, [models, availableModels]);

  const renderActiveWorkspace = () => {
    switch (activeWorkspace) {
      case "images":
        return <ImageStudio onOpenChat={() => setActiveWorkspace("chat")} />;
      case "library":
        return (
          <PromptLibrary
            onUsePrompt={(text: string) => {
              setActiveWorkspace("chat");
              setInput(text);
            }}
          />
        );
      case "plugins":
        return <PluginHub />;
      case "code":
        return <CodeSandbox />;
      case "more":
        return <WorkspaceUtilities />;
      case "chat":
      default:
        return (
          <>
            {compareMode ? (
              <CompareView
                activeThread={activeThread}
                models={models}
                onSelectModelSlot={handleSelectModelSlot}
                streaming={streaming}
                streamingDeltas={streamingDeltas}
                pendingTurnIds={pendingTurnIds}
                onSynthesize={handleSynthesize}
                onSelectSuggestion={(promptText) => setInput(promptText)}
              />
            ) : (
              <MessageThread
                activeThread={activeThread}
                streaming={streaming}
                streamingDeltas={streamingDeltas}
                pendingTurnIds={pendingTurnIds}
                onRegenerate={handleRegenerate}
                onSuggestionClick={(promptText) => setInput(promptText)}
                onSynthesize={handleSynthesize}
              />
            )}
            <ChatComposer
              input={input}
              setInput={setInput}
              attachments={attachments}
              setAttachments={setAttachments}
              streaming={streaming}
              onSend={() => handleSendPrompt()}
              onStop={handleStop}
              activeThread={!!activeThread}
              selectedModelId={models[0]}
              onSelectModel={handleSelectModel}
              compareMode={compareMode}
            />
          </>
        );
    }
  };

  const renderMainContent = () => (
    <main className="relative flex h-full min-w-0 w-full flex-1 flex-col bg-background overflow-hidden">
      {/* Model-Responsive Ambient Aura */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed -top-40 right-1/4 h-[450px] w-[450px] rounded-full blur-[140px] opacity-15 transition-all duration-1000",
          activeProvider === "anthropic" && "bg-amber-500",
          activeProvider === "google" && "bg-indigo-500",
          activeProvider === "openai" && "bg-emerald-500",
          !["anthropic", "google", "openai"].includes(activeProvider) && "bg-violet-500",
        )}
      />

      <TopBar
        activeThread={activeWorkspace === "chat" ? activeThread : null}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        onExportChat={handleExportChat}
        selectedModelId={models[0]}
        onSelectModel={handleSelectModel}
        compareMode={compareMode}
        onToggleCompareMode={handleToggleCompareMode}
      />
      {renderActiveWorkspace()}

      {/* Living Canvas Split-View Drawer */}
      <LivingCanvas
        artifact={canvasArtifact}
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        onOpenSandbox={(code) => {
          localStorage.setItem("mena:sandbox_code", code);
          setActiveWorkspace("code");
          setIsCanvasOpen(false);
        }}
      />
    </main>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden h-full w-full md:flex">
        <aside
          className="flex h-full shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
          style={{ width: sidebarWidth }}
        >
          <Sidebar
            threads={threads}
            activeThreadId={threadId}
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={(ws) => {
              setActiveWorkspace(ws);
              if (ws === "chat") {
                navigate({ to: "/" });
              }
            }}
            updateThread={updateThread}
            deleteThread={deleteThread}
            setShareThread={setShareThread}
            setRenameThread={setRenameThread}
            setRenameTitle={setRenameTitle}
            setMoveThread={setMoveThread}
            setSelectedProject={setSelectedProject}
            setCustomProject={setCustomProject}
          />
        </aside>

        <div
          className="group relative w-4 cursor-col-resize"
          onMouseDown={startResize}
          aria-hidden="true"
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/60 transition-colors group-hover:bg-border" />
          <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col">
          {renderMainContent()}
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="flex w-72 flex-col bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar
            threads={threads}
            activeThreadId={threadId}
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={(ws) => {
              setActiveWorkspace(ws);
              setMobileNavOpen(false);
              if (ws === "chat") {
                navigate({ to: "/" });
              }
            }}
            onSelectThread={() => setMobileNavOpen(false)}
            updateThread={updateThread}
            deleteThread={deleteThread}
            setShareThread={setShareThread}
            setRenameThread={setRenameThread}
            setRenameTitle={setRenameTitle}
            setMoveThread={setMoveThread}
            setSelectedProject={setSelectedProject}
            setCustomProject={setCustomProject}
          />
        </SheetContent>
      </Sheet>

      <div className="flex h-full w-full md:hidden">
        {renderMainContent()}
      </div>

      <ThreadDialogs
        shareThread={shareThread}
        setShareThread={setShareThread}
        renameThread={renameThread}
        setRenameThread={setRenameThread}
        renameTitle={renameTitle}
        setRenameTitle={setRenameTitle}
        moveThread={moveThread}
        setMoveThread={setMoveThread}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        customProject={customProject}
        setCustomProject={setCustomProject}
        existingProjects={existingProjects}
        updateThread={updateThread}
      />
    </div>
  );
}
