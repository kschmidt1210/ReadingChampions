"use client";

import { Plus, Minus, BookOpen } from "lucide-react";
import type { ScoreBreakdown } from "@/lib/scoring-types";

export function ScorePreview({
  breakdown,
  completed = true,
}: {
  breakdown: ScoreBreakdown | null;
  completed?: boolean;
}) {
  if (!breakdown) {
    return (
      <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400 border border-dashed border-gray-200">
        Select a book to see score preview
      </div>
    );
  }

  const baseLabel = breakdown.basePoints > 1 ? "Nonfiction" : "Fiction";

  return (
    <div className="rounded-xl overflow-hidden border border-indigo-200/60">
      <div className={`px-4 py-3 flex items-baseline justify-between ${
        completed
          ? "bg-gradient-to-r from-indigo-600 to-violet-600"
          : "bg-gradient-to-r from-amber-500 to-orange-500"
      }`}>
        <span className={`text-sm font-medium ${completed ? "text-indigo-100" : "text-amber-100"}`}>
          {completed ? "Estimated Score" : "In-Progress Score"}
        </span>
        <span className="text-2xl font-extrabold text-white">
          {breakdown.finalScore.toFixed(2)}
        </span>
      </div>
      <div className="bg-indigo-50/50 px-4 py-3 space-y-1.5">
        {completed ? (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Base ({baseLabel})</span>
            <span className="font-medium">{breakdown.basePoints.toFixed(3)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-xs text-gray-400">
            <span>Base ({baseLabel})</span>
            <span className="font-medium italic">+{breakdown.basePoints > 0 ? breakdown.basePoints.toFixed(3) : (breakdown.pagePoints > 0 ? "on completion" : "0.000")}</span>
          </div>
        )}
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
        {!completed && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-200/60">
            <BookOpen className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">
              Base points added when you finish this book
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
