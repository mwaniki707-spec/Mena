import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Cpu, ChevronDown, Check, RefreshCw, Settings } from "lucide-react";
import { useAvailableModels } from "@/hooks/use-threads";
import { PROVIDER_LABELS } from "@/lib/models";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ModelDropdownProps = {
  selectedModelId?: string | null;
  onSelectModel?: (modelId: string) => void;
  onOpenSettings?: () => void;
  label?: string;
  badgeClass?: string;
  className?: string;
  triggerClassName?: string;
  compact?: boolean;
};

export function ModelDropdown({
  selectedModelId,
  onSelectModel,
  onOpenSettings,
  label,
  badgeClass,
  className,
  triggerClassName,
  compact = false,
}: ModelDropdownProps) {
  const { models: availableModels, refreshLiveModels } = useAvailableModels();

  const currentModel =
    availableModels.find((m) => m.id === selectedModelId) ?? availableModels[0];

  const handleRefreshClick = async () => {
    toast.promise(refreshLiveModels(), {
      loading: "Connecting to API to fetch models...",
      success: "API models refreshed!",
      error: "Could not fetch models from API",
    });
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {label && (
        <span
          className={cn(
            "rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            badgeClass ?? "bg-primary/10 text-primary border border-primary/20",
          )}
        >
          {label}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-2 rounded-xl border-border bg-card/80 px-2.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground shadow-xs transition-colors",
              triggerClassName,
            )}
          >
            <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
            <span
              className={cn(
                "truncate",
                compact ? "max-w-[110px]" : "max-w-[130px] sm:max-w-[170px]",
              )}
            >
              {currentModel?.label ?? "Select Model"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Connected API Models</span>
            <button
              type="button"
              onClick={handleRefreshClick}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline not-italic cursor-pointer"
              title="Refresh models from API"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <DropdownMenuSeparator className="my-1" />
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {availableModels.map((m) => {
              const isSelected = m.id === (selectedModelId ?? availableModels[0]?.id);
              return (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => {
                    onSelectModel?.(m.id);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors",
                    isSelected
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-accent",
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
          {onOpenSettings && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => {
                  onOpenSettings();
                }}
                className="cursor-pointer gap-2 rounded-xl text-xs text-primary font-medium focus:bg-primary/10"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Add / Manage API Key...</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
