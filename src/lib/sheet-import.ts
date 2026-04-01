import type { BonusKey, DeductionKey, HometownBonusKey } from "@/types/database";

// ---------------------------------------------------------------------------
// CSV parsing (RFC-compliant, handles quoted fields)
// ---------------------------------------------------------------------------

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(current);
        current = "";
        if (row.some((cell) => cell.trim() !== "")) {
          rows.push(row);
        }
        row = [];
      } else {
        current += ch;
      }
    }
  }
  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Google Sheet URL helpers
// ---------------------------------------------------------------------------

export function parseSheetId(url: string): string | null {
  const trimmed = url.trim();
  // Match /d/{id}/ in a Google Sheets URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // If no URL structure, treat entire string as an ID if it looks like one
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function buildCsvExportUrl(sheetId: string, tabName: string): string {
  const encodedTab = encodeURIComponent(tabName);
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedTab}`;
}

// ---------------------------------------------------------------------------
// Column indices for per-player tabs (no playerName column)
// ---------------------------------------------------------------------------

export const COL = {
  isbn: 0,
  title: 1,
  pages: 2,
  yearPublished: 3,
  completed: 4,
  fictionNf: 5,
  series: 6,
  genre: 7,
  country: 8,
  dateFinished: 9,
  rating: 10,
  hometownBonus: 11,
  bonus1: 12,
  bonus2: 13,
  bonus3: 14,
  deductions: 15,
} as const;

// ---------------------------------------------------------------------------
// Label → key mapping (from spreadsheet labels to DB enum keys)
// ---------------------------------------------------------------------------

const BONUS_MAP: Record<string, BonusKey> = {
  "classics (1900-present)": "classics_1900",
  "1750-1900": "classics_1750",
  "before 1750": "classics_pre1750",
  series: "series",
  translation: "translation",
  "birth year": "birth_year",
  "current year": "current_year",
  "relatable holiday or event": "holiday_event",
  "relatable holiday/event": "holiday_event",
  "award winner": "award_winner",
};

const DEDUCTION_MAP: Record<string, DeductionKey> = {
  "graphic novel": "graphic_novel",
  "comics / manga": "comics_manga",
  "comics/manga": "comics_manga",
  audiobook: "audiobook",
  "re-read": "reread",
  "audiobook re-read": "audiobook_reread",
  "audiobook reread": "audiobook_reread",
};

const HOMETOWN_MAP: Record<string, HometownBonusKey> = {
  '"florida" / "hometown state"': "state_name",
  '"tampa" / "hometown city"': "city_name",
  "set in florida / my state": "state_setting",
};

const GENRE_ALIASES: Record<string, string> = {
  "mystery/thriller": "Mystery/Thriller",
  mystery: "Mystery/Thriller",
  thriller: "Mystery/Thriller",
  "legal thriller": "Mystery/Thriller",
  afrofuturism: "Afrofuturism",
  fantasy: "Fantasy",
  "portal fantasy": "Fantasy",
  "ya fantasy": "Fantasy",
  "urban fantasy": "Fantasy",
  romance: "Romance",
  "western romance": "Romance",
  "folklore / mythology": "Folklore/Mythology",
  "folklore/mythology": "Folklore/Mythology",
  "historical fiction": "Historical Fiction",
  memoir: "Memoir",
  "weird fiction": "Weird Fiction",
};

export function mapBonus(label: string): BonusKey | null {
  return BONUS_MAP[label.trim().toLowerCase()] ?? null;
}

export function mapDeduction(label: string): DeductionKey | null {
  return DEDUCTION_MAP[label.trim().toLowerCase()] ?? null;
}

export function mapHometown(label: string): HometownBonusKey | null {
  return HOMETOWN_MAP[label.trim().toLowerCase()] ?? null;
}

export function matchGenre(
  raw: string,
  genreMap: Map<string, string>
): { id: string; name: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const directId = genreMap.get(lower);
  if (directId) {
    const name = [...genreMap.entries()].find(([, v]) => v === directId)?.[0] ?? trimmed;
    return { id: directId, name: trimmed };
  }
  const alias = GENRE_ALIASES[lower];
  if (alias) {
    const aliasId = genreMap.get(alias.toLowerCase()) ?? null;
    if (aliasId) return { id: aliasId, name: alias };
  }
  return null;
}

export function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const datePart = trimmed.split(" ")[0];
  const parts = datePart.split("/");
  if (parts.length === 3) {
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Row parsing
// ---------------------------------------------------------------------------

export interface ParsedSheetRow {
  isbn: string | null;
  title: string;
  pages: number;
  yearPublished: number | null;
  completed: boolean;
  fiction: boolean;
  seriesName: string | null;
  genreId: string | null;
  genreName: string | null;
  genreRaw: string;
  country: string | null;
  dateFinished: string | null;
  rating: number | null;
  hometownBonus: HometownBonusKey | null;
  bonus1: BonusKey | null;
  bonus2: BonusKey | null;
  bonus3: BonusKey | null;
  deduction: DeductionKey | null;
  sheetPoints: number | null;
}

export function parseSheetRow(
  row: string[],
  genreMap: Map<string, string>,
  pointsColIndex: number | null
): { parsed: ParsedSheetRow } | { skip: true } | { error: string } {
  const title = row[COL.title]?.trim();
  const pagesStr = row[COL.pages]?.trim();
  const pages = parseInt(pagesStr, 10);

  if (!title && (!pagesStr || isNaN(parseInt(pagesStr, 10)))) return { skip: true };
  if (!title) return { error: "Missing title" };
  if (isNaN(pages) || pages <= 0) return { error: `Invalid page count "${pagesStr}" for "${title}"` };

  const genreRaw = row[COL.genre]?.trim() || "";
  let sheetPoints: number | null = null;
  if (pointsColIndex !== null) {
    const pts = parseFloat(row[pointsColIndex]?.trim());
    if (!isNaN(pts)) sheetPoints = pts;
  }

  const genreMatch = matchGenre(genreRaw, genreMap);

  return {
    parsed: {
      isbn: row[COL.isbn]?.trim() || null,
      title,
      pages,
      yearPublished: parseInt(row[COL.yearPublished]?.trim(), 10) || null,
      completed: row[COL.completed]?.trim().toLowerCase() !== "no",
      fiction: row[COL.fictionNf]?.trim().toLowerCase() !== "nonfiction",
      seriesName: row[COL.series]?.trim() || null,
      genreId: genreMatch?.id ?? null,
      genreName: genreMatch?.name ?? (genreRaw || null),
      genreRaw,
      country: row[COL.country]?.trim() || null,
      dateFinished: parseDate(row[COL.dateFinished] || ""),
      rating: row[COL.rating]?.trim() ? parseFloat(row[COL.rating].trim()) : null,
      hometownBonus: mapHometown(row[COL.hometownBonus] || ""),
      bonus1: mapBonus(row[COL.bonus1] || ""),
      bonus2: mapBonus(row[COL.bonus2] || ""),
      bonus3: mapBonus(row[COL.bonus3] || ""),
      deduction: mapDeduction(row[COL.deductions] || ""),
      sheetPoints,
    },
  };
}

// ---------------------------------------------------------------------------
// Points column auto-detection
// ---------------------------------------------------------------------------

export function detectPointsColumn(headerRow: string[]): number | null {
  for (let i = 0; i < headerRow.length; i++) {
    const h = headerRow[i]?.trim().toLowerCase();
    if (h === "points" || h === "total points" || h === "score") {
      return i;
    }
  }
  return null;
}
