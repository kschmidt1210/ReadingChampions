"use client";

import type { ScoreBreakdown } from "@/lib/scoring-types";

export function ScorePreview({ breakdown }: { breakdown: ScoreBreakdown | null }) {
  if (!breakdown) {
    return (
      <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
        Select a book to see score preview
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-indigo-900">Estimated Score</span>
        <span className="text-2xl font-extrabold text-indigo-600">
          {breakdown.finalScore.toFixed(2)}
        </span>
      </div>
      <div className="space-y-1 text-xs text-indigo-800">
        <div className="flex justify-between">
          <span>Base ({breakdown.basePoints > 1 ? "Nonfiction" : "Fiction"})</span>
          <span>{breakdown.basePoints.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Page points</span>
          <span>+{breakdown.pagePoints.toFixed(3)}</span>
        </div>
        {breakdown.bonusAmounts.map((b) => (
          <div key={b.key} className="flex justify-between text-green-700">
            <span>{b.label}</span>
            <span>+{b.amount.toFixed(3)}</span>
          </div>
        ))}
        {breakdown.hometownBonusAmount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Hometown bonus</span>
            <span>+{breakdown.hometownBonusAmount.toFixed(3)}</span>
          </div>
        )}
        {breakdown.deductionLabel && (
          <div className="flex justify-between text-red-600">
            <span>{breakdown.deductionLabel}</span>
            <span>×{breakdown.deductionMultiplier}</span>
          </div>
        )}
        {breakdown.newCountryMultiplier > 1 && (
          <div className="flex justify-between text-green-700">
            <span>New Country</span>
            <span>×{breakdown.newCountryMultiplier.toFixed(3)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
