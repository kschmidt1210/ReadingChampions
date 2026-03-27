"use client";

import type { BonusKey } from "@/types/database";
import { BONUS_LABELS } from "@/lib/scoring-types";
import { Badge } from "@/components/ui/badge";
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
            <Badge
              key={key}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                isActive
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "hover:bg-green-50 text-gray-600"
              )}
              onClick={() => toggle(key)}
            >
              {BONUS_LABELS[key]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
