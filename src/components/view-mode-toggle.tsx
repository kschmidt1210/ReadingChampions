"use client";

import { useRef } from "react";
import { useViewMode } from "@/components/view-mode-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ViewMode } from "@/types/database";

const TOAST_ID = "view-mode-default";

export function ViewModeToggle() {
  const { viewMode, savedDefault, setViewMode, saveAsDefault } = useViewMode();
  const toastShownForRef = useRef<ViewMode | null>(null);

  function handleSwitch(mode: ViewMode) {
    setViewMode(mode);

    if (mode !== savedDefault && toastShownForRef.current !== mode) {
      toastShownForRef.current = mode;
      toast(`Switched to ${mode === "detail" ? "Detail" : "Default"} view`, {
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
      <button
        type="button"
        onClick={() => handleSwitch("default")}
        className={cn(
          "px-3 py-2 md:py-1.5 text-xs font-medium transition-colors",
          viewMode === "default"
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Default
      </button>
      <button
        type="button"
        onClick={() => handleSwitch("detail")}
        className={cn(
          "px-3 py-2 md:py-1.5 text-xs font-medium transition-colors",
          viewMode === "detail"
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Detail
      </button>
    </div>
  );
}
