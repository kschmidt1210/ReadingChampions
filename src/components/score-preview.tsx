"use client";

import { Plus, Minus } from "lucide-react";
import type { ScoreBreakdown } from "@/lib/scoring-types";

export function ScorePreview({ breakdown }: { breakdown: ScoreBreakdown | null }) {
  if (!breakdown) {
    return (
      <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400 border border-dashed border-gray-200">
        Select a book to see score preview
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-indigo-200/60">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-baseline justify-between">
        <span className="text-sm font-medium text-indigo-100">Estimated Score</span>
        <span className="text-2xl font-extrabold text-white">
          {breakdown.finalScore.toFixed(2)}
        </span>
      </div>
      <div className="bg-indigo-50/50 px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Base ({breakdown.basePoints > 1 ? "Nonfiction" : "Fiction"})</span>
          <span className="font-medium">{breakdown.basePoints.toFixed(3)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Page points</span>
          <span className="font-medium text-gray-700">+{breakdown.pagePoints.toFixed(3)}</span>
        </div>
        {breakdown.bonusAmounts.map((b) => (
          <div key={b.key} className="flex items-center justify-between text-xs text-emerald-700">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              {b.label}
            </span>
            <span className="font-medium">+{b.amount.toFixed(3)}</span>
          </div>
        ))}
        {breakdown.hometownBonusAmount > 0 && (
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Hometown bonus
            </span>
            <span className="font-medium">+{breakdown.hometownBonusAmount.toFixed(3)}</span>
          </div>
        )}
        {breakdown.deductionLabel && (
          <div className="flex items-center justify-between text-xs text-red-600">
            <span className="flex items-center gap-1">
              <Minus className="h-3 w-3" />
              {breakdown.deductionLabel}
            </span>
            <span className="font-medium">&times;{breakdown.deductionMultiplier}</span>
          </div>
        )}
        {breakdown.newCountryMultiplier > 1 && (
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              New Country
            </span>
            <span className="font-medium">&times;{breakdown.newCountryMultiplier.toFixed(3)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
