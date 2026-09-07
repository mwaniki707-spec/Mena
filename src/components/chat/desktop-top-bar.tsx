import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  File,
  Menu,
  Plus,
  Sun,
  Moon,
  Columns,
} from "lucide-react";
import { ModelDropdown } from "@/components/chat/model-dropdown";
import { type Thread } from "@/hooks/use-threads";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

type TopBarProps = {
  activeThread: Thread | null;
  onOpenMobileNav: () => void;
  onExportChat: (format: "markdown" | "json") => void;
  selectedModelId?: string | null;
  onSelectModel?: (modelId: string) => void;
  onOpenSettings?: () => void;
  compareMode?: boolean;
  onToggleCompareMode?: () => void;
  /** @deprecated backwards compatibility */
  consensusMode?: boolean;
  /** @deprecated backwards compatibility */
  onToggleConsensusMode?: () => void;
};

export function TopBar({
  activeThread,
  onOpenMobileNav,
  onExportChat,
  selectedModelId,
  onSelectModel,
  onOpenSettings,
  compareMode,
  onToggleCompareMode,
  consensusMode,
  onToggleConsensusMode,
}: TopBarProps) {
  const { theme, toggle: toggleTheme } = useTheme();

  const isCompare = compareMode ?? consensusMode ?? false;
  const handleToggleCompare = onToggleCompareMode ?? onToggleConsensusMode;

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm md:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onOpenMobileNav}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {!isCompare && (
            <ModelDropdown
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              onOpenSettings={onOpenSettings}
              compact
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          {handleToggleCompare && (
            <Button
              variant={isCompare ? "default" : "ghost"}
              size="icon"
              className={cn("h-8 w-8 rounded-xl", isCompare && "bg-primary text-primary-foreground shadow-xs")}
              onClick={handleToggleCompare}
              title={isCompare ? "Compare Models: ON (Split Screen Active)" : "Compare Models: OFF"}
            >
              <Columns className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label="New chat">
            <Link to="/">
              <Plus className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Desktop top bar */}
      <div className="hidden items-center justify-between border-b border-border/60 bg-card/30 px-4 py-2 backdrop-blur-sm md:flex">
        <div className="flex items-center gap-3">
          {/* Show single dropdown in top bar only when NOT in Compare split mode */}
          {!isCompare && (
            <ModelDropdown
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              onOpenSettings={onOpenSettings}
            />
          )}

          {/* Compare Models Toggle Button */}
          {handleToggleCompare && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleCompare}
              className={cn(
                "h-8 gap-2 rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer",
                isCompare
                  ? "border-primary/50 bg-primary/15 text-primary shadow-xs hover:bg-primary/25 ring-1 ring-primary/20"
                  : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
              title={
                isCompare
                  ? "Compare Mode ON: Split screen enabled with per-side model selectors"
                  : "Turn ON to split screen vertically and compare two models side-by-side"
              }
            >
              <Columns className={cn("h-3.5 w-3.5", isCompare && "text-primary")} />
              <span>{isCompare ? "Compare Models: ON" : "Compare Models"}</span>
            </Button>
          )}

          {activeThread && (
            <span className="max-w-xs lg:max-w-md truncate text-xs font-medium text-muted-foreground">
              {activeThread.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {activeThread && activeThread.turns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    onExportChat("markdown");
                  }}
                  className="cursor-pointer gap-2"
                >
                  <FileText className="h-4 w-4" /> Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onExportChat("json");
                  }}
                  className="cursor-pointer gap-2"
                >
                  <File className="h-4 w-4" /> JSON (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => {
              toggleTheme();
            }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
