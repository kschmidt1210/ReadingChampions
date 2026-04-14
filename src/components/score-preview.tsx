"use client";

import { Plus, Minus, BookOpen, Clock, XCircle } from "lucide-react";
import type { ScoreBreakdown } from "@/lib/scoring-types";
import type { BookEntryStatus } from "@/types/database";

export function ScorePreview({
  breakdown,
  status = "completed",
}: {
  breakdown: ScoreBreakdown | null;
  status?: BookEntryStatus;
}) {
  if (!breakdown) {
    return (
      <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground border border-dashed border-border">
        Select a book to see score preview
      </div>
    );
  }

  const baseLabel = breakdown.fiction ? "Fiction" : "Nonfiction";

  const headerConfig = {
    reading: {
      bg: "bg-gradient-to-r from-amber-500 to-orange-500",
      labelColor: "text-amber-100",
      label: "Expected Score",
    },
    completed: {
      bg: "bg-gradient-to-r from-indigo-600 to-violet-600",
      labelColor: "text-indigo-100",
      label: "Score",
    },
    did_not_finish: {
      bg: "bg-gradient-to-r from-gray-500 to-gray-600",
      labelColor: "text-gray-200",
      label: "DNF Score",
    },
  }[status];

  return (
    <div className="rounded-xl overflow-hidden border border-indigo-200/60 dark:border-indigo-800/40">
      <div className={`px-4 py-3 flex items-baseline justify-between ${headerConfig.bg}`}>
        <span className={`text-sm font-medium ${headerConfig.labelColor}`}>
          {headerConfig.label}
        </span>
        <span className="text-2xl font-extrabold text-white">
          {breakdown.finalScore.toFixed(2)}
        </span>
      </div>
      <div className="bg-indigo-50/50 dark:bg-indigo-950/30 px-4 py-3 space-y-1.5">
        {status === "completed" ? (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Completion Bonus ({baseLabel})</span>
            <span className="font-medium">{breakdown.basePoints.toFixed(3)}</span>
          </div>
        ) : status === "reading" ? (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Completion Bonus ({baseLabel})</span>
            <span className="font-medium italic">+{breakdown.basePoints > 0 ? breakdown.basePoints.toFixed(3) : "on completion"}</span>
          </div>
        ) : (
          <div className="flex justify-between text-xs text-muted-foreground line-through">
            <span>Completion Bonus ({baseLabel})</span>
            <span className="font-medium">0.000</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Page points</span>
          <span className="font-medium text-foreground">+{breakdown.pagePoints.toFixed(3)}</span>
        </div>
        {breakdown.bonusAmounts.map((b) => (
          <div key={b.key} className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              {b.label}
            </span>
            <span className="font-medium">+{b.amount.toFixed(3)}</span>
          </div>
        ))}
        {breakdown.hometownBonusAmount > 0 && (
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Hometown bonus
            </span>
            <span className="font-medium">+{breakdown.hometownBonusAmount.toFixed(3)}</span>
          </div>
        )}
        {breakdown.deductionLabel && (
          <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400">
            <span className="flex items-center gap-1">
              <Minus className="h-3 w-3" />
              {breakdown.deductionLabel}
            </span>
            <span className="font-medium">&times;{breakdown.deductionMultiplier}</span>
          </div>
        )}
        {breakdown.newCountryMultiplier > 1 && (
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              New Country
            </span>
            <span className="font-medium">&times;{breakdown.newCountryMultiplier.toFixed(3)}</span>
          </div>
        )}
        {status === "reading" && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/60">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Points added to your total when finished
            </span>
          </div>
        )}
        {status === "did_not_finish" && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/60">
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              No completion bonus for unfinished books
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
