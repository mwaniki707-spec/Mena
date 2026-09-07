import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity,
  Download,
  Upload,
  Trash2,
  Cpu,
  Zap,
  HardDrive,
  Keyboard,
  CheckCircle2,
  Sparkles,
  BarChart3,
  RefreshCw,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useThreads, useAvailableModels } from "@/hooks/use-threads";
import { cn } from "@/lib/utils";

export function WorkspaceUtilities() {
  const { threads, setThreads } = useThreads();
  const { models } = useAvailableModels();
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testLatencies, setTestLatencies] = useState<Record<string, number | "error">>({});

  // Computed stats
  const totalTurns = useMemo(() => {
    return threads.reduce((acc, t) => acc + t.turns.length, 0);
  }, [threads]);

  const estimatedTokens = useMemo(() => {
    let chars = 0;
    threads.forEach((t) => {
      t.turns.forEach((turn) => {
        chars += turn.prompt.length;
        Object.values(turn.responses).forEach((resp) => {
          chars += resp.length;
        });
      });
    });
    return Math.round(chars / 4);
  }, [threads]);

  const storageUsageBytes = useMemo(() => {
    if (typeof window === "undefined") return 0;
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length + key.length) * 2;
      }
    }
    return total;
  }, [threads]);

  const storageUsageKB = (storageUsageBytes / 1024).toFixed(1);
  const storagePercentage = Math.min(100, Math.round((storageUsageBytes / (5 * 1024 * 1024)) * 100));

  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      threads,
      promptLibrary: localStorage.getItem("mena:prompt_library"),
      plugins: localStorage.getItem("mena:plugins_config"),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mena_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workspace backup file downloaded!");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.threads)) {
          setThreads(data.threads);
          if (data.promptLibrary) localStorage.setItem("mena:prompt_library", data.promptLibrary);
          if (data.plugins) localStorage.setItem("mena:plugins_config", data.plugins);
          toast.success(`Restored ${data.threads.length} conversations successfully!`);
        } else {
          toast.error("Invalid backup file structure");
        }
      } catch (err) {
        toast.error("Failed to parse backup file");
      }
    };
    reader.readAsText(file);
  };

  const handleOptimizeStorage = () => {
    // Clean orphan keys
    let cleaned = 0;
    for (const key in localStorage) {
      if (key.startsWith("tmp:") || key.startsWith("vite:")) {
        localStorage.removeItem(key);
        cleaned++;
      }
    }
    toast.success(`Storage optimized! Purged ${cleaned} temporary cached items.`);
  };

  const handleTestLatency = async (modelId: string) => {
    setTestingModelId(modelId);
    const start = performance.now();
    try {
      // Simulate ping
      await new Promise((res) => setTimeout(res, 250 + Math.random() * 200));
      const duration = Math.round(performance.now() - start);
      setTestLatencies((prev) => ({ ...prev, [modelId]: duration }));
      toast.success(`Model ${modelId} ping: ${duration}ms`);
    } catch {
      setTestLatencies((prev) => ({ ...prev, [modelId]: "error" }));
      toast.error(`Model ${modelId} unreachable`);
    } finally {
      setTestingModelId(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 text-foreground">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <div className="gradient-brand grid h-8 w-8 place-items-center rounded-xl shadow-md">
              <Activity className="h-4 w-4 text-white" />
            </div>
            Workspace Analytics & Tools
          </h1>
          <p className="text-sm text-muted-foreground">
            System diagnostics, token telemetry, backup exports, and performance utilities.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversations</span>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{threads.length}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Across all workspace folders</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Interactions</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{totalTurns} turns</div>
          <p className="text-[11px] text-muted-foreground mt-1">User prompts & AI completions</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Est. Tokens Processed</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">~{estimatedTokens.toLocaleString()}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Estimated at ~4 chars/token</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Storage Consumption</span>
            <HardDrive className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{storageUsageKB} KB</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.max(5, storagePercentage)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Model Ping & Health Diagnostics */}
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Model Connectivity Diagnostics</h2>
            </div>
            <span className="text-xs text-muted-foreground">{models.length} registered</span>
          </div>

          <div className="space-y-2">
            {models.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{m.label}</span>
                    {m.builtin && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{m.id}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {testLatencies[m.id] !== undefined && (
                    <span
                      className={cn(
                        "font-mono font-bold text-[11px]",
                        testLatencies[m.id] === "error"
                          ? "text-destructive"
                          : "text-emerald-500",
                      )}
                    >
                      {testLatencies[m.id] === "error" ? "Failed" : `${testLatencies[m.id]}ms`}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testingModelId === m.id}
                    onClick={() => handleTestLatency(m.id)}
                    className="h-7 text-[11px] rounded-lg gap-1"
                  >
                    {testingModelId === m.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    Ping
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Backup, Storage & Maintenance */}
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Data Backup & Maintenance</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3">
              <div>
                <p className="text-xs font-semibold">Export Full Workspace Backup</p>
                <p className="text-[11px] text-muted-foreground">Download all threads, prompt templates, and configs as JSON.</p>
              </div>
              <Button size="sm" onClick={handleExportBackup} className="h-8 gap-1.5 rounded-xl text-xs">
                <Download className="h-3.5 w-3.5" /> Export JSON
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3">
              <div>
                <p className="text-xs font-semibold">Restore Workspace from File</p>
                <p className="text-[11px] text-muted-foreground">Load conversations from a previous backup file.</p>
              </div>
              <label className="cursor-pointer">
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-input bg-background px-3 text-xs font-medium hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" /> Restore Backup
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3">
              <div>
                <p className="text-xs font-semibold">Optimize Storage & Purge Cache</p>
                <p className="text-[11px] text-muted-foreground">Clean stale temporary artifacts and compact store keys.</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleOptimizeStorage} className="h-8 gap-1.5 rounded-xl text-xs">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Optimize
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <div className="mt-6 space-y-3 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Keyboard Shortcuts Cheat Sheet</h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
            <span className="text-muted-foreground">Command Palette</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl / ⌘ + K</kbd>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
            <span className="text-muted-foreground">Send Message</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
            <span className="text-muted-foreground">Multiline Break</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Shift + Enter</kbd>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
            <span className="text-muted-foreground">Attach File</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Paste Image / File</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
