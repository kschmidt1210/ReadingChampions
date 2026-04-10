"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "oklch(0.65 0.19 260)",   // indigo
  "oklch(0.70 0.18 150)",   // emerald
  "oklch(0.75 0.15 50)",    // amber
  "oklch(0.60 0.22 300)",   // violet
  "oklch(0.70 0.17 20)",    // coral/red
  "oklch(0.72 0.14 200)",   // teal
  "oklch(0.68 0.20 330)",   // pink
  "oklch(0.74 0.12 100)",   // lime
  "oklch(0.62 0.18 240)",   // blue
  "oklch(0.76 0.13 70)",    // yellow-orange
  "oklch(0.58 0.22 280)",   // purple
  "oklch(0.72 0.16 170)",   // cyan
  "oklch(0.66 0.14 30)",    // brown-orange
  "oklch(0.70 0.20 350)",   // magenta
  "oklch(0.64 0.15 220)",   // steel blue
  "oklch(0.78 0.10 120)",   // pale green
  "oklch(0.55 0.20 310)",   // deep violet
  "oklch(0.73 0.11 60)",    // khaki
  "oklch(0.60 0.16 190)",   // dark teal
  "oklch(0.68 0.18 10)",    // tomato
];

interface GenrePieChartProps {
  genreCounts: Array<{ name: string; count: number }>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; count: number; pct: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const { name, count, pct } = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
      <span className="text-sm font-medium text-gray-900">{name}</span>
      <span className="text-sm text-gray-500 ml-1.5">
        {count} ({pct.toFixed(1)}%)
      </span>
    </div>
  );
}

export function GenrePieChart({ genreCounts }: GenrePieChartProps) {
  const data = useMemo(() => {
    const total = genreCounts.reduce((sum, g) => sum + g.count, 0);
    return genreCounts
      .sort((a, b) => b.count - a.count)
      .map((g) => ({
        name: g.name,
        count: g.count,
        pct: total > 0 ? (g.count / total) * 100 : 0,
      }));
  }, [genreCounts]);

  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius="85%"
            innerRadius="40%"
            dataKey="count"
            paddingAngle={1}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-gray-600 truncate max-w-[10rem]">
              {entry.name}
            </span>
            <span className="text-xs text-gray-400 tabular-nums">
              {entry.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
