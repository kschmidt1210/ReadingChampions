"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TimeTravelDataPoint {
  index: number;
  year: number;
  title: string;
}

interface TimeTravelChartProps {
  data: TimeTravelDataPoint[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TimeTravelDataPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const { title, year } = payload[0].payload;
  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-sm max-w-[200px]">
      <p className="text-sm font-medium text-foreground truncate">{title}</p>
      <p className="text-sm text-muted-foreground">Published {year}</p>
    </div>
  );
}

export function TimeTravelChart({ data }: TimeTravelChartProps) {
  if (data.length < 2) return null;

  const years = data.map((d) => d.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const padding = Math.max(Math.ceil((maxYear - minYear) * 0.05), 5);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f3f4f6"
          vertical={false}
        />
        <XAxis
          dataKey="index"
          tick={false}
          axisLine={{ stroke: "#e5e7eb" }}
          tickLine={false}
        />
        <YAxis
          domain={[minYear - padding, maxYear + padding]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="year"
          stroke="oklch(0.546 0.245 262.881)"
          strokeWidth={2}
          dot={{ r: 3, fill: "oklch(0.546 0.245 262.881)", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "oklch(0.488 0.243 264.376)", strokeWidth: 2, stroke: "#fff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
