"use client";

import type { DeductionKey } from "@/types/database";
import { DEDUCTION_LABELS } from "@/lib/scoring-types";
import { cn } from "@/lib/utils";

const ALL_DEDUCTION_KEYS = Object.keys(DEDUCTION_LABELS) as DeductionKey[];

export function DeductionChips({
  selected,
  onChange,
}: {
  selected: DeductionKey | null;
  onChange: (deduction: DeductionKey | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Deduction</label>
      <div className="flex flex-wrap gap-2">
        {ALL_DEDUCTION_KEYS.map((key) => {
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
                  ? "bg-rose-50 text-rose-700 border-rose-500 shadow-sm"
                  : "border-transparent ring-1 ring-gray-200 hover:bg-rose-50 hover:ring-rose-300 text-gray-600"
              )}
            >
              {DEDUCTION_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
