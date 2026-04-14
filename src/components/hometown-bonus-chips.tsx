"use client";

import type { HometownBonusKey } from "@/types/database";
import { HOMETOWN_BONUS_LABELS } from "@/lib/scoring-types";
import { cn } from "@/lib/utils";

const ALL_HOMETOWN_KEYS = Object.keys(
  HOMETOWN_BONUS_LABELS
) as HometownBonusKey[];

export function HometownBonusChips({
  selected,
  onChange,
}: {
  selected: HometownBonusKey | null;
  onChange: (value: HometownBonusKey | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Hometown Bonus</label>
      <div className="flex flex-wrap gap-2">
        {ALL_HOMETOWN_KEYS.map((key) => {
          const isActive = selected === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(isActive ? null : key)}
              className={cn(
                "inline-flex items-center rounded-full border-2 px-3 py-2 md:py-1 text-xs font-semibold cursor-pointer transition-all duration-200",
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-sm"
                  : "border-transparent ring-1 ring-border hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:ring-emerald-300 dark:hover:ring-emerald-700 text-muted-foreground"
              )}
            >
              {HOMETOWN_BONUS_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
