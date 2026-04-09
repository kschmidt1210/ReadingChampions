"use client";

import { Check } from "lucide-react";
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
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-transparent shadow-sm"
                  : "border-gray-200 hover:bg-pink-50 hover:border-pink-300 text-gray-600"
              )}
            >
              {isActive && <Check className="h-3 w-3 mr-1" />}
              {HOMETOWN_BONUS_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
