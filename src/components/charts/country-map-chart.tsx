"use client";

import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { resolveCountryId } from "@/lib/countries";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function interpolateColor(t: number): string {
  // From very light lavender to deep purple, matching the app's violet/indigo palette
  const r = Math.round(237 - t * 120);
  const g = Math.round(233 - t * 175);
  const b = Math.round(254 - t * 80);
  return `rgb(${r}, ${g}, ${b})`;
}

interface CountryMapChartProps {
  countryCounts: Map<string, number>;
}

export function CountryMapChart({ countryCounts }: CountryMapChartProps) {
  const [tooltip, setTooltip] = useState<{ name: string; count: number } | null>(null);

  const { idToCount, nameToCount, maxCount } = useMemo(() => {
    const idMap = new Map<string, number>();
    const nameMap = new Map<string, number>();
    let max = 0;
    for (const [name, count] of countryCounts) {
      const id = resolveCountryId(name);
      if (id) {
        idMap.set(id, (idMap.get(id) ?? 0) + count);
        max = Math.max(max, idMap.get(id)!);
      } else {
        const lower = name.toLowerCase().trim();
        nameMap.set(lower, (nameMap.get(lower) ?? 0) + count);
        max = Math.max(max, nameMap.get(lower)!);
      }
    }
    return { idToCount: idMap, nameToCount: nameMap, maxCount: max };
  }, [countryCounts]);

  if (countryCounts.size === 0) return null;

  return (
    <div className="space-y-2">
      <div className="relative w-full" style={{ aspectRatio: "2 / 1" }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 120, center: [0, 30] }}
          className="w-full h-full"
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const geoId = geo.id as string;
                  const geoName = (geo.properties.name as string | undefined)?.toLowerCase().trim() ?? "";
                  const count = idToCount.get(geoId) ?? nameToCount.get(geoName) ?? 0;
                  const t = maxCount > 0 ? count / maxCount : 0;
                  const fill = count > 0 ? interpolateColor(t) : "#f3f4f6";

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#e5e7eb"
                      strokeWidth={0.5}
                      onMouseEnter={() => {
                        const name = geo.properties.name as string;
                        if (count > 0) setTooltip({ name, count });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: count > 0 ? interpolateColor(Math.min(t + 0.15, 1)) : "#e5e7eb" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm pointer-events-none">
            <span className="text-sm font-medium text-gray-900">{tooltip.name}</span>
            <span className="text-sm text-gray-500 ml-1.5">
              {tooltip.count} {tooltip.count === 1 ? "book" : "books"}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-gray-500 tabular-nums">1</span>
        <div
          className="flex-1 h-2 rounded-full"
          style={{
            background: `linear-gradient(to right, ${interpolateColor(0.1)}, ${interpolateColor(0.5)}, ${interpolateColor(1)})`,
          }}
        />
        <span className="text-xs text-gray-500 tabular-nums">{maxCount}</span>
      </div>
    </div>
  );
}
