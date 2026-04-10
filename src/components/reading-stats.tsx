"use client";

import { useState } from "react";
import { BarChart3, ChevronDown, Globe, PieChart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountryMapChart } from "@/components/charts/country-map-chart";
import { GenrePieChart } from "@/components/charts/genre-pie-chart";
import { TimeTravelChart } from "@/components/charts/time-travel-chart";

interface ReadingStatsProps {
  countryCounts: Map<string, number>;
  genreCounts: Array<{ name: string; count: number }>;
  timeTravelData: Array<{ index: number; year: number; title: string }>;
}

export function ReadingStats({
  countryCounts,
  genreCounts,
  timeTravelData,
}: ReadingStatsProps) {
  const [expanded, setExpanded] = useState(false);

  const hasMap = countryCounts.size > 0;
  const hasPie = genreCounts.length > 0;
  const hasTimeline = timeTravelData.length >= 2;

  if (!hasMap && !hasPie && !hasTimeline) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-2.5 text-left hover:bg-gray-50/60 active:bg-gray-100/40 transition-colors cursor-pointer"
      >
        <BarChart3 className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
        <span className="flex-1 font-semibold text-gray-900">
          Reading Insights
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-300 shrink-0 transition-transform duration-200",
            expanded && "rotate-180 text-gray-500"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {hasMap && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-500" />
                <h4 className="text-sm font-semibold text-gray-800">
                  Countries Heatmap
                </h4>
              </div>
              <CountryMapChart countryCounts={countryCounts} />
            </div>
          )}

          {hasPie && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-semibold text-gray-800">
                  Genre Distribution
                </h4>
              </div>
              <GenrePieChart genreCounts={genreCounts} />
            </div>
          )}

          {hasTimeline && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-gray-800">
                  Time Travel
                </h4>
                <span className="text-xs text-gray-400">
                  Publication year by reading order
                </span>
              </div>
              <TimeTravelChart data={timeTravelData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
