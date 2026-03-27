"use client";

import { Check } from "lucide-react";
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
                "cursor-pointer transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white border-transparent shadow-sm"
                  : "hover:bg-rose-50 hover:border-rose-300 text-gray-600"
              )}
              onClick={() => onChange(isActive ? null : key)}
            >
              {isActive && <Check className="h-3 w-3 mr-1" />}
              {DEDUCTION_LABELS[key]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
