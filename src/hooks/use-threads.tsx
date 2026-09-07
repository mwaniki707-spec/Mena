import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { BUILTIN_MODELS, DEFAULT_MODELS, DEPRECATED_MODEL_IDS, fetchModelsFromAPI, type ModelEntry } from "@/lib/models";
import { SecureStorage } from "@/lib/crypto";

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Base64 data URL for image previews and images sent to the model. */
  dataUrl?: string;
  /** Raw text content for text-based files (txt, csv, json, md, etc.). */
  textContent?: string;
};

export type Turn = {
  id: string;
  prompt: string;
  /** Files the user attached to this prompt. */
  attachments: Attachment[];
  /** Which model slots this prompt was sent to (indexes into thread.models). */
  targets: number[];
  /** Responses keyed by slot index ("0" / "1"). */
  responses: Record<string, string>;
};

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  models: (string | null)[];
  turns: Turn[];
  project?: string;
  pinned?: boolean;
  isCompare?: boolean;
};

export function isCompareThread(t: Thread): boolean {
  if (t.isCompare !== undefined) {
    return Boolean(t.isCompare);
  }
  return Boolean(
    t.turns.some((turn) => turn.targets && turn.targets.length > 1)
  );
}

const THREADS_KEY = "llm-compare:threads:v1";
const MODELS_KEY = "llm-compare:available-models:v4";

const DEFAULT_MODEL_ID = BUILTIN_MODELS[0]?.id ?? null;

const MODELS_KEY_LEGACY = [
  "llm-compare:available-models:v3",
  "llm-compare:available-models:v2",
] as const;

function migrateThreads(threads: Thread[]): Thread[] {
  if (!DEFAULT_MODEL_ID) return threads;
  const validIds = new Set(DEFAULT_MODELS.map((m) => m.id));
  return threads.map((t) => ({
    ...t,
    models: t.models.map((id) =>
      !id || DEPRECATED_MODEL_IDS.has(id) || !validIds.has(id) ? DEFAULT_MODEL_ID : id,
    ),
    turns: t.turns.map((turn) => ({
      ...turn,
      attachments: turn.attachments ?? [],
    })),
  }));
}

function readThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    return migrateThreads(JSON.parse(raw) as Thread[]);
  } catch {
    return [];
  }
}

function writeThreads(threads: Thread[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch (err) {
    console.error("Failed to save threads to localStorage (quota exceeded?):", err);
    if (typeof window !== "undefined" && "toast" in window) {
      // @ts-ignore
      window.toast?.error("Storage quota low. Old threads might not save properly.");
    }
  }
}

function mergeWithBuiltins(userModels: ModelEntry[]): ModelEntry[] {
  const builtinIds = new Set(BUILTIN_MODELS.map((m) => m.id));
  const userNonBuiltin = userModels.filter(
    (m) => !builtinIds.has(m.id) && !DEPRECATED_MODEL_IDS.has(m.id),
  );
  return [...BUILTIN_MODELS, ...userNonBuiltin];
}

function readSavedModels(): ModelEntry[] {
  if (typeof window === "undefined") return DEFAULT_MODELS;
  try {
    // Try to get encrypted models first
    const encryptedModels = SecureStorage.getItem<ModelEntry[]>("encrypted-models");
    if (encryptedModels) {
      return mergeWithBuiltins(encryptedModels);
    }
    
    // Fallback to unencrypted for backward compatibility
    let raw = localStorage.getItem(MODELS_KEY);
    if (!raw) {
      for (const legacyKey of MODELS_KEY_LEGACY) {
        raw = localStorage.getItem(legacyKey);
        if (raw) {
          localStorage.removeItem(legacyKey);
          break;
        }
      }
    }
    if (!raw) return DEFAULT_MODELS;
    const parsed = JSON.parse(raw) as ModelEntry[];
    return Array.isArray(parsed) && parsed.length > 0
      ? mergeWithBuiltins(parsed)
      : DEFAULT_MODELS;
  } catch {
    return DEFAULT_MODELS;
  }
}

type ThreadsContextValue = {
  threads: Thread[];
  createThread: (defaults?: { models?: (string | null)[]; project?: string; isCompare?: boolean }) => Thread;
  updateThread: (id: string, updater: (t: Thread) => Thread) => void;
  deleteThread: (id: string) => void;
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  pendingTurnIds: Set<string>;
  markTurnPending: (turnId: string) => void;
  clearTurnPending: (turnId: string) => void;
};

type ModelsContextValue = {
  models: ModelEntry[];
  addModel: (m: ModelEntry) => void;
  removeModel: (id: string) => void;
  refreshLiveModels: () => Promise<void>;
};

const ThreadsContext = createContext<ThreadsContextValue | null>(null);
const ModelsContext = createContext<ModelsContextValue | null>(null);

/** Shared chat state — survives route changes when navigating to a new thread. */
export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [threads, setThreadsState] = useState<Thread[]>(() => readThreads());
  const [models, setModels] = useState<ModelEntry[]>(() => readSavedModels());
  const [pendingTurnIds, setPendingTurnIds] = useState<Set<string>>(() => new Set());

  const refreshLiveModels = useCallback(async () => {
    try {
      const liveModels = await fetchModelsFromAPI();
      if (liveModels.length > 0) {
        setModels((prev: ModelEntry[]) => {
          const userModels = prev.filter((m: ModelEntry) => !m.builtin);
          const liveIds = new Set(liveModels.map((m: ModelEntry) => m.id));
          const nonDuplicateUserModels = userModels.filter((m: ModelEntry) => !liveIds.has(m.id));
          return [...liveModels, ...nonDuplicateUserModels];
        });
      }
    } catch (err) {
      console.warn("Error refreshing live API models:", err);
    }
  }, []);

  useEffect(() => {
    refreshLiveModels();
  }, [refreshLiveModels]);

  const setThreads: Dispatch<SetStateAction<Thread[]>> = useCallback((action) => {
    setThreadsState((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      writeThreads(next);
      return next;
    });
  }, []);

  useEffect(() => {
    // Store both encrypted and unencrypted for backward compatibility during transition
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
    SecureStorage.setItem("encrypted-models", models);
  }, [models]);

  const createThread = useCallback(
    (defaults?: { models?: (string | null)[]; project?: string; isCompare?: boolean }) => {
      const t: Thread = {
        id: crypto.randomUUID(),
        title: "New chat",
        updatedAt: Date.now(),
        models: defaults?.models ?? [null, null],
        project: defaults?.project,
        isCompare: defaults?.isCompare,
        turns: [],
      };
      setThreads((prev) => [t, ...prev]);
      return t;
    },
    [setThreads],
  );

  const updateThread = useCallback(
    (id: string, updater: (t: Thread) => Thread) => {
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...updater(t), updatedAt: Date.now() } : t)),
      );
    },
    [setThreads],
  );

  const deleteThread = useCallback(
    (id: string) => {
      setThreads((prev) => prev.filter((t) => t.id !== id));
    },
    [setThreads],
  );

  const addModel = useCallback(
    (m: ModelEntry) => setModels((prev) => [...prev.filter((x) => x.id !== m.id), m]),
    [],
  );

  const removeModel = useCallback(
    (id: string) => setModels((prev) => prev.filter((m) => m.id !== id && !m.builtin)),
    [],
  );

  const markTurnPending = useCallback((turnId: string) => {
    setPendingTurnIds((prev) => new Set(prev).add(turnId));
  }, []);

  const clearTurnPending = useCallback((turnId: string) => {
    setPendingTurnIds((prev) => {
      const next = new Set(prev);
      next.delete(turnId);
      return next;
    });
  }, []);

  return (
    <ThreadsContext.Provider
      value={{
        threads,
        createThread,
        updateThread,
        deleteThread,
        setThreads,
        pendingTurnIds,
        markTurnPending,
        clearTurnPending,
      }}
    >
      <ModelsContext.Provider value={{ models, addModel, removeModel, refreshLiveModels }}>
        {children}
      </ModelsContext.Provider>
    </ThreadsContext.Provider>
  );
}

export function useThreads() {
  const ctx = useContext(ThreadsContext);
  if (!ctx) throw new Error("useThreads must be used within ChatStoreProvider");
  return ctx;
}

export function useAvailableModels() {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error("useAvailableModels must be used within ChatStoreProvider");
  return ctx;
}
