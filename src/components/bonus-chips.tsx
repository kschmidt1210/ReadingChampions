"use client";

import { Check } from "lucide-react";
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
                "cursor-pointer transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-transparent shadow-sm"
                  : "hover:bg-emerald-50 hover:border-emerald-300 text-gray-600"
              )}
              onClick={() => toggle(key)}
            >
              {isActive && <Check className="h-3 w-3 mr-1" />}
              {BONUS_LABELS[key]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
