import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useThreads, isCompareThread } from "@/hooks/use-threads";
import { useTheme } from "@/hooks/use-theme";
import { MessageSquare, Columns, Plus, Sun, Moon, Settings, Search, Command } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { threads, createThread } = useThreads();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredThreads = threads
    .filter((t) => !query || t.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  const handleSelectThread = (id: string) => {
    setOpen(false);
    navigate({ to: "/$threadId", params: { threadId: id } });
  };

  const handleNewChat = () => {
    setOpen(false);
    navigate({ to: "/" });
  };

  const handleToggleTheme = () => {
    toggleTheme();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl">
        <DialogHeader className="p-3 border-b border-border">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type a command or search chats..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-9 bg-transparent"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              <Command className="h-3 w-3" /> K
            </kbd>
          </div>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-sm">
          {/* Action items */}
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-1">
            Quick Actions
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-accent transition"
          >
            <Plus className="h-4 w-4 text-primary" />
            <span>New Chat</span>
          </button>
          <button
            onClick={handleToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-accent transition"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            <span>Switch to {theme === "dark" ? "Light" : "Dark"} Mode</span>
          </button>

          {/* Conversations */}
          {filteredThreads.length > 0 && (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1">
                Recent Conversations
              </div>
              {filteredThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectThread(t.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left hover:bg-accent transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCompareThread(t) ? (
                      <Columns className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{t.title}</span>
                  </div>
                  {t.project && (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-[100px]">
                      {t.project}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
