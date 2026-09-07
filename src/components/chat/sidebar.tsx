import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  MessageSquare,
  Columns,
  Pin,
  MoreVertical,
  Share2,
  Pencil,
  FolderPlus,
  Trash2,
  Folder,
  ChevronRight,
  ChevronDown,
  PencilLine,
  ImageIcon,
  Library,
  Plug,
  Code2,
  Ellipsis,
  Plus,
  Check,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useThreads, isCompareThread, type Thread } from "@/hooks/use-threads";
import { cn } from "@/lib/utils";

type SidebarProps = {
  threads: Thread[];
  activeThreadId?: string;
  activeWorkspace: "chat" | "images" | "library" | "plugins" | "code" | "more";
  onSelectWorkspace: (ws: "chat" | "images" | "library" | "plugins" | "code" | "more") => void;
  onSelectThread?: () => void;
  updateThread: (id: string, updater: (t: Thread) => Thread) => void;
  deleteThread: (id: string) => void;
  setShareThread: (t: Thread) => void;
  setRenameThread: (t: Thread) => void;
  setRenameTitle: (title: string) => void;
  setMoveThread: (t: Thread) => void;
  setSelectedProject: (proj: string) => void;
  setCustomProject: (proj: string) => void;
};

export function Sidebar({
  threads,
  activeThreadId,
  activeWorkspace,
  onSelectWorkspace,
  onSelectThread,
  updateThread,
  deleteThread,
  setShareThread,
  setRenameThread,
  setRenameTitle,
  setMoveThread,
  setSelectedProject,
  setCustomProject,
}: SidebarProps) {
  const navigate = useNavigate();
  const { createThread } = useThreads();
  const [searchRaw, setSearchRaw] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null);

  // New Project Dialog state
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Rename Project state
  const [projectToRename, setProjectToRename] = useState<string | null>(null);
  const [newProjectRenameTitle, setNewProjectRenameTitle] = useState("");

  // Share Project state
  const [projectToShare, setProjectToShare] = useState<string | null>(null);
  const [copiedProjectLink, setCopiedProjectLink] = useState(false);

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;

    const newThread = createThread({ project: name });
    onSelectWorkspace("chat");
    navigate({ to: "/$threadId", params: { threadId: newThread.id } });
    onSelectThread?.();
    toast.success(`Project "${name}" created`);
    setNewProjectName("");
    setIsNewProjectOpen(false);
  };

  const handleCreateChatInProject = (pName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newThread = createThread({ project: pName });
    onSelectWorkspace("chat");
    navigate({ to: "/$threadId", params: { threadId: newThread.id } });
    onSelectThread?.();
    toast.success(`New chat created in "${pName}"`);
  };

  const handleRenameProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToRename) return;
    const nextName = newProjectRenameTitle.trim();
    if (!nextName) return;

    if (nextName !== projectToRename) {
      threads.forEach((t) => {
        if (t.project === projectToRename) {
          updateThread(t.id, (prev) => ({ ...prev, project: nextName }));
        }
      });
      toast.success(`Project renamed to "${nextName}"`);
    }
    setProjectToRename(null);
  };

  // 200ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchRaw), 200);
    return () => clearTimeout(timer);
  }, [searchRaw]);

  const filteredThreads = useMemo(() => {
    return threads
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.project && t.project.toLowerCase().includes(q));
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [threads, searchQuery]);

  const toggleProjectCollapse = (pName: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [pName]: !prev[pName] }));
  };

  const { projectGroups, standaloneThreads } = useMemo(() => {
    const groups: Record<string, Thread[]> = {};
    const standalone: Thread[] = [];

    filteredThreads.forEach((t) => {
      if (t.project && t.project.trim()) {
        const p = t.project.trim();
        groups[p] = groups[p] || [];
        groups[p].push(t);
      } else {
        standalone.push(t);
      }
    });

    return { projectGroups: groups, standaloneThreads: standalone };
  }, [filteredThreads]);

  const railItems = [
    {
      key: "chat" as const,
      label: "New chat",
      icon: PencilLine,
      action: () => {
        onSelectWorkspace("chat");
        setSearchRaw("");
        navigate({ to: "/" });
        onSelectThread?.();
      },
    },
    {
      key: "images" as const,
      label: "Images",
      icon: ImageIcon,
      action: () => {
        onSelectWorkspace("images");
        onSelectThread?.();
      },
    },
    {
      key: "library" as const,
      label: "Library",
      icon: Library,
      action: () => {
        onSelectWorkspace("library");
        onSelectThread?.();
      },
    },
    {
      key: "plugins" as const,
      label: "Plugins",
      icon: Plug,
      action: () => {
        onSelectWorkspace("plugins");
        onSelectThread?.();
      },
    },
    {
      key: "code" as const,
      label: "Code",
      icon: Code2,
      action: () => {
        onSelectWorkspace("code");
        onSelectThread?.();
      },
    },
    {
      key: "more" as const,
      label: "More",
      icon: Ellipsis,
      action: () => {
        onSelectWorkspace("more");
        onSelectThread?.();
      },
    },
  ] as const;

  const renderThreadItem = (t: Thread) => {
    const isActive = t.id === activeThreadId && activeWorkspace === "chat";
    return (
      <div
        key={t.id}
        className={cn(
          "group relative flex items-center rounded-xl text-xs transition-colors",
          isActive
            ? "bg-black/10 dark:bg-white/10 text-black dark:text-white font-medium shadow-xs"
            : "hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white/80 hover:text-black dark:hover:text-white",
        )}
      >
        <Link
          to="/$threadId"
          params={{ threadId: t.id }}
          onClick={onSelectThread}
          className="flex min-w-0 flex-1 flex-col py-2 pl-2.5 pr-8"
        >
          <div className="flex items-center gap-2">
            {t.pinned ? (
              <Pin className="h-3 w-3 shrink-0 text-amber-500 rotate-45" />
            ) : isCompareThread(t) ? (
              <span title="Compare Models chat" className="flex shrink-0 items-center">
                <Columns className="h-3 w-3 shrink-0 text-black/70 dark:text-white/60" />
              </span>
            ) : (
              <MessageSquare className="h-3 w-3 shrink-0 text-black/70 dark:text-white/60" />
            )}
            <span className="truncate">{t.title}</span>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-black/70 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-sidebar/90 backdrop-blur-xs border border-sidebar-border shadow-xs z-10"
              aria-label="Chat options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                updateThread(t.id, (prev) => ({ ...prev, pinned: !prev.pinned }));
                toast.success(t.pinned ? "Thread unpinned" : "Thread pinned");
              }}
              className="cursor-pointer gap-2 text-xs"
            >
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t.pinned ? "Unpin chat" : "Pin chat"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShareThread(t);
              }}
              className="cursor-pointer gap-2 text-xs"
            >
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Share</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setRenameThread(t);
                setRenameTitle(t.title);
              }}
              className="cursor-pointer gap-2 text-xs"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setMoveThread(t);
                setSelectedProject(t.project || "");
                setCustomProject("");
              }}
              className="cursor-pointer gap-2 text-xs"
            >
              <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t.project ? "Change project" : "Move to project"}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setThreadToDelete(t);
              }}
              className="cursor-pointer gap-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar px-3 py-3 text-black dark:text-white transition-colors">
      <div className="mb-3 px-1">
        <input
          type="text"
          value={searchRaw}
          onChange={(e) => setSearchRaw(e.target.value)}
          placeholder="Search chats..."
          className="w-full rounded-xl border border-sidebar-border bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/40 focus:border-black/30 dark:focus:border-white/20 focus:outline-none transition-colors font-medium"
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        <nav className="space-y-1">
          {railItems.map(({ key, label, icon: Icon, action }) => {
            const isActive = activeWorkspace === key;
            return (
              <button
                key={key}
                type="button"
                onClick={action}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                  isActive
                    ? "bg-black/10 dark:bg-white/10 text-black dark:text-white font-semibold shadow-xs"
                    : "text-black dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white",
                )}
                aria-label={label}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-5 w-5 items-center justify-center", isActive ? "text-primary" : "text-black dark:text-white/80")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Projects section */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold tracking-wider text-black/75 dark:text-white/50 uppercase">Projects</span>
            <button
              type="button"
              onClick={() => setIsNewProjectOpen(true)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-black/75 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
              title="Create New Project"
              aria-label="Create New Project"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {Object.keys(projectGroups).length > 0 ? (
              Object.entries(projectGroups).map(([projectName, pThreads]) => (
                <div key={projectName} className="space-y-0.5">
                  <div className="group flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[12px] text-black dark:text-white/85 transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white">
                    <button
                      type="button"
                      onClick={() => toggleProjectCollapse(projectName)}
                      aria-expanded={!collapsedProjects[projectName]}
                      className="flex flex-1 items-center gap-2.5 min-w-0 text-left font-medium"
                    >
                      <Folder className="h-4 w-4 text-black/80 dark:text-white/70 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium">{projectName}</span>
                      {collapsedProjects[projectName] ? (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      )}
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => handleCreateChatInProject(projectName, e)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-black/75 dark:text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-opacity"
                        title={`New chat in ${projectName}`}
                        aria-label={`New chat in ${projectName}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-black/75 dark:text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-opacity"
                            title="Project options"
                            aria-label="Project options"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToRename(projectName);
                              setNewProjectRenameTitle(projectName);
                            }}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Rename project</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToShare(projectName);
                            }}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Share project</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {!collapsedProjects[projectName] && (
                    <div className="ml-4 space-y-0.5 border-l border-sidebar-border pl-2">
                      {pThreads.map(renderThreadItem)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-2 py-1 text-xs text-black/60 dark:text-white/40 italic flex items-center justify-between font-medium">
                <span>No projects yet</span>
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(true)}
                  className="text-xs text-primary hover:underline not-italic cursor-pointer font-semibold"
                >
                  + Create
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Standalone Chats section (preventing duplication with Projects) */}
        <div className="mt-6 space-y-2">
          <div className="px-1 text-[10px] font-bold tracking-wider text-black/75 dark:text-white/50 uppercase">Recent Chats</div>
          <div className="space-y-0.5">
            {standaloneThreads.length > 0 ? (
              standaloneThreads.map(renderThreadItem)
            ) : (
              <div className="px-2 py-1 text-xs text-black/60 dark:text-white/40 italic font-medium">No standalone chats</div>
            )}
          </div>
        </div>
      </div>

      {/* Create New Project Dialog */}
      <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Create New Project
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProjectSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-project-name">Project Name</Label>
              <Input
                id="new-project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Marketing, Work, Research..."
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsNewProjectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newProjectName.trim()}>
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={!!projectToRename} onOpenChange={(open) => !open && setProjectToRename(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Rename Project
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameProjectSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-project-name">Project Name</Label>
              <Input
                id="rename-project-name"
                value={newProjectRenameTitle}
                onChange={(e) => setNewProjectRenameTitle(e.target.value)}
                placeholder="Enter new project name"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setProjectToRename(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newProjectRenameTitle.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Project Dialog */}
      <Dialog open={!!projectToShare} onOpenChange={(open) => !open && setProjectToShare(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Share all conversations in "{projectToShare}" with others.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  projectToShare
                    ? typeof window !== "undefined"
                      ? `${window.location.origin}/project/${encodeURIComponent(projectToShare)}`
                      : `https://mena.app/project/${encodeURIComponent(projectToShare)}`
                    : ""
                }
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!projectToShare) return;
                  const url = `${window.location.origin}/project/${encodeURIComponent(projectToShare)}`;
                  navigator.clipboard.writeText(url);
                  setCopiedProjectLink(true);
                  toast.success("Project share link copied to clipboard");
                  setTimeout(() => setCopiedProjectLink(false), 2000);
                }}
                className="shrink-0 gap-1.5"
              >
                {copiedProjectLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copiedProjectLink ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Styled Delete Confirmation Dialog */}
      <AlertDialog open={!!threadToDelete} onOpenChange={(open) => !open && setThreadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{threadToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (threadToDelete) {
                  deleteThread(threadToDelete.id);
                  toast.success("Chat deleted");
                  if (activeThreadId === threadToDelete.id) {
                    navigate({ to: "/" });
                  }
                  setThreadToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
