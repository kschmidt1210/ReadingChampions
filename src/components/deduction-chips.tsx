"use client";

import type { DeductionKey } from "@/types/database";
import { DEDUCTION_LABELS } from "@/lib/scoring-types";
import { Badge } from "@/components/ui/badge";
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
            <Badge
              key={key}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                isActive
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "hover:bg-red-50 text-gray-600"
              )}
              onClick={() => onChange(isActive ? null : key)}
            >
              {DEDUCTION_LABELS[key]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
