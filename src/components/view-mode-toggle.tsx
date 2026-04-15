"use client";

import { useRef } from "react";
import { useViewMode } from "@/components/view-mode-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ViewMode } from "@/types/database";

const TOAST_ID = "view-mode-default";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  simple: "Simple",
  default: "Default",
  detail: "Detail",
};

export function ViewModeToggle() {
  const { viewMode, savedDefault, setViewMode, saveAsDefault } = useViewMode();
  const toastShownForRef = useRef<ViewMode | null>(null);

  function handleSwitch(mode: ViewMode) {
    setViewMode(mode);

    if (mode !== savedDefault && toastShownForRef.current !== mode) {
      toastShownForRef.current = mode;
      toast(`Switched to ${VIEW_MODE_LABELS[mode]} view`, {
        id: TOAST_ID,
        action: {
          label: "Set as default",
          onClick: () => saveAsDefault(mode),
        },
        duration: 5000,
        onDismiss: () => {
          toastShownForRef.current = null;
        },
        onAutoClose: () => {
          toastShownForRef.current = null;
        },
      });
    } else if (mode === savedDefault) {
      toastShownForRef.current = null;
      toast.dismiss(TOAST_ID);
    }
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
      {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => handleSwitch(mode)}
          className={cn(
            "px-3 py-2 md:py-1.5 text-xs font-medium transition-colors",
            viewMode === mode
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {VIEW_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
