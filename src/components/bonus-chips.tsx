"use client";

import type { BonusKey } from "@/types/database";
import { BONUS_LABELS } from "@/lib/scoring-types";
import { cn } from "@/lib/utils";

const ALL_BONUS_KEYS = (Object.keys(BONUS_LABELS) as BonusKey[]).filter(
  (k) => k !== "new_country"
);

export function BonusChips({
  selected,
  onChange,
  maxSelections = 3,
}: {
  selected: (BonusKey | null)[];
  onChange: (bonuses: (BonusKey | null)[]) => void;
  maxSelections?: number;
}) {
  const activeKeys = selected.filter((k): k is BonusKey => k !== null);

  function toggle(key: BonusKey) {
    if (activeKeys.includes(key)) {
      onChange(selected.map((k) => (k === key ? null : k)));
    } else if (activeKeys.length < maxSelections) {
      const newSelected = [...selected];
      const emptyIdx = newSelected.findIndex((k) => k === null);
      if (emptyIdx !== -1) newSelected[emptyIdx] = key;
      onChange(newSelected);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Bonuses ({activeKeys.length}/{maxSelections})
      </label>
      <div className="flex flex-wrap gap-2">
        {ALL_BONUS_KEYS.map((key) => {
          const isActive = activeKeys.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggle(key)}
              className={cn(
                "inline-flex items-center rounded-full border-2 px-3 py-2 md:py-1 text-xs font-semibold cursor-pointer transition-all duration-200",
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-sm"
                  : "border-transparent ring-1 ring-border hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:ring-emerald-300 dark:hover:ring-emerald-700 text-muted-foreground"
              )}
            >
              {BONUS_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
