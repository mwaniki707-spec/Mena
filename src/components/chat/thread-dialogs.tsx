import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Share2, Check, Copy, Pencil, FolderPlus, Folder } from "lucide-react";
import type { Thread } from "@/hooks/use-threads";
import { cn } from "@/lib/utils";

type ThreadDialogsProps = {
  shareThread: Thread | null;
  setShareThread: (t: Thread | null) => void;
  renameThread: Thread | null;
  setRenameThread: (t: Thread | null) => void;
  renameTitle: string;
  setRenameTitle: (title: string) => void;
  moveThread: Thread | null;
  setMoveThread: (t: Thread | null) => void;
  selectedProject: string;
  setSelectedProject: (proj: string) => void;
  customProject: string;
  setCustomProject: (proj: string) => void;
  existingProjects: string[];
  updateThread: (id: string, updater: (t: Thread) => Thread) => void;
};

export function ThreadDialogs({
  shareThread,
  setShareThread,
  renameThread,
  setRenameThread,
  renameTitle,
  setRenameTitle,
  moveThread,
  setMoveThread,
  selectedProject,
  setSelectedProject,
  customProject,
  setCustomProject,
  existingProjects,
  updateThread,
}: ThreadDialogsProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  return (
    <>
      {/* Share Dialog */}
      <Dialog open={!!shareThread} onOpenChange={(open) => !open && setShareThread(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Conversation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Anyone with this link will be able to view this conversation.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  shareThread
                    ? typeof window !== "undefined"
                      ? `${window.location.origin}/${shareThread.id}`
                      : `https://mena.app/${shareThread.id}`
                    : ""
                }
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!shareThread) return;
                  const url = `${window.location.origin}/${shareThread.id}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  toast.success("Share link copied to clipboard");
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="shrink-0 gap-1.5"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameThread} onOpenChange={(open) => !open && setRenameThread(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Rename Conversation
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!renameThread) return;
              const newTitle = renameTitle.trim();
              if (newTitle) {
                updateThread(renameThread.id, (t) => ({ ...t, title: newTitle }));
                toast.success("Chat renamed");
              }
              setRenameThread(null);
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="chat-title">Title</Label>
              <Input
                id="chat-title"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Enter new conversation title"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setRenameThread(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameTitle.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move to Project Dialog */}
      <Dialog open={!!moveThread} onOpenChange={(open) => !open && setMoveThread(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Move to Project
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!moveThread) return;
              const targetProj = customProject.trim() || selectedProject.trim();
              updateThread(moveThread.id, (t) => ({
                ...t,
                project: targetProj || undefined,
              }));
              if (targetProj) {
                toast.success(`Moved to "${targetProj}"`);
              } else {
                toast.success("Removed from project");
              }
              setMoveThread(null);
            }}
            className="space-y-4 py-2"
          >
            {existingProjects.length > 0 && (
              <div className="space-y-2">
                <Label>Select Existing Project</Label>
                <div className="flex flex-wrap gap-2">
                  {existingProjects.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setSelectedProject(p);
                        setCustomProject("");
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        selectedProject === p && !customProject
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent text-muted-foreground",
                      )}
                    >
                      <Folder className="h-3.5 w-3.5" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom-project">
                {existingProjects.length > 0 ? "Or Create New Project" : "Project Name"}
              </Label>
              <Input
                id="custom-project"
                value={customProject}
                onChange={(e) => {
                  setCustomProject(e.target.value);
                  if (e.target.value) setSelectedProject("");
                }}
                placeholder="e.g. Work, Marketing, Research..."
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              {moveThread?.project ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (!moveThread) return;
                    updateThread(moveThread.id, (t) => ({ ...t, project: undefined }));
                    toast.success("Removed from project");
                    setMoveThread(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove from project
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setMoveThread(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
