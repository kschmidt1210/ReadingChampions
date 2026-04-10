"use client";

import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Map common country display names to ISO 3166-1 numeric codes used by world-atlas
const COUNTRY_NAME_TO_ID: Record<string, string> = {
  "Afghanistan": "004", "Albania": "008", "Algeria": "012", "Angola": "024",
  "Argentina": "032", "Armenia": "051", "Australia": "036", "Austria": "040",
  "Azerbaijan": "031", "Bahamas": "044", "Bangladesh": "050", "Belarus": "112",
  "Belgium": "056", "Belize": "084", "Benin": "204", "Bhutan": "064",
  "Bolivia": "068", "Bosnia and Herzegovina": "070", "Botswana": "072",
  "Brazil": "076", "Brunei": "096", "Bulgaria": "100", "Burkina Faso": "854",
  "Burundi": "108", "Cambodia": "116", "Cameroon": "120", "Canada": "124",
  "Central African Republic": "140", "Chad": "148", "Chile": "152",
  "China": "156", "Colombia": "170", "Congo": "178",
  "Democratic Republic of the Congo": "180", "Costa Rica": "188",
  "Croatia": "191", "Cuba": "192", "Cyprus": "196", "Czech Republic": "203",
  "Czechia": "203", "Denmark": "208", "Djibouti": "262",
  "Dominican Republic": "214", "Ecuador": "218", "Egypt": "818",
  "El Salvador": "222", "Equatorial Guinea": "226", "Eritrea": "232",
  "Estonia": "233", "Eswatini": "748", "Ethiopia": "231", "Fiji": "242",
  "Finland": "246", "France": "250", "Gabon": "266", "Gambia": "270",
  "Georgia": "268", "Germany": "276", "Ghana": "288", "Greece": "300",
  "Guatemala": "320", "Guinea": "324", "Guinea-Bissau": "624",
  "Guyana": "328", "Haiti": "332", "Honduras": "340", "Hungary": "348",
  "Iceland": "352", "India": "356", "Indonesia": "360", "Iran": "364",
  "Iraq": "368", "Ireland": "372", "Israel": "376", "Italy": "380",
  "Ivory Coast": "384", "Côte d'Ivoire": "384", "Jamaica": "388",
  "Japan": "392", "Jordan": "400", "Kazakhstan": "398", "Kenya": "404",
  "Kuwait": "414", "Kyrgyzstan": "417", "Laos": "418",
  "Latvia": "428", "Lebanon": "422", "Lesotho": "426", "Liberia": "430",
  "Libya": "434", "Lithuania": "440", "Luxembourg": "442",
  "Madagascar": "450", "Malawi": "454", "Malaysia": "458", "Mali": "466",
  "Mauritania": "478", "Mexico": "484", "Moldova": "498", "Mongolia": "496",
  "Montenegro": "499", "Morocco": "504", "Mozambique": "508",
  "Myanmar": "104", "Namibia": "516", "Nepal": "524", "Netherlands": "528",
  "New Zealand": "554", "Nicaragua": "558", "Niger": "562", "Nigeria": "566",
  "North Korea": "408", "North Macedonia": "807", "Norway": "578",
  "Oman": "512", "Pakistan": "586", "Palestine": "275", "Panama": "591",
  "Papua New Guinea": "598", "Paraguay": "600", "Peru": "604",
  "Philippines": "608", "Poland": "616", "Portugal": "620", "Qatar": "634",
  "Romania": "642", "Russia": "643", "Rwanda": "646",
  "Saudi Arabia": "682", "Senegal": "686", "Serbia": "688",
  "Sierra Leone": "694", "Singapore": "702", "Slovakia": "703",
  "Slovenia": "705", "Solomon Islands": "090", "Somalia": "706",
  "South Africa": "710", "South Korea": "410", "South Sudan": "728",
  "Spain": "724", "Sri Lanka": "144", "Sudan": "729", "Suriname": "740",
  "Sweden": "752", "Switzerland": "756", "Syria": "760", "Taiwan": "158",
  "Tajikistan": "762", "Tanzania": "834", "Thailand": "764", "Togo": "768",
  "Trinidad and Tobago": "780", "Tunisia": "788", "Turkey": "792",
  "Turkmenistan": "795", "Uganda": "800", "Ukraine": "804",
  "United Arab Emirates": "784", "United Kingdom": "826",
  "United States": "840", "USA": "840", "US": "840",
  "Uruguay": "858", "Uzbekistan": "860", "Venezuela": "862",
  "Vietnam": "704", "Yemen": "887", "Zambia": "894", "Zimbabwe": "716",
  // Common alternate spellings
  "UK": "826", "Great Britain": "826", "England": "826", "Scotland": "826",
  "Wales": "826", "Northern Ireland": "826",
  "Republic of Korea": "410",
  "DPRK": "408",
  "DR Congo": "180", "DRC": "180",
  "Swaziland": "748",
};

function resolveCountryId(name: string): string | undefined {
  const direct = COUNTRY_NAME_TO_ID[name];
  if (direct) return direct;

  const lower = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(COUNTRY_NAME_TO_ID)) {
    if (key.toLowerCase() === lower) return val;
  }
  return undefined;
}

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
