/**
 * Fix script: Re-attribute Kody's book entries to the real account.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/fix-kody-entries.ts
 */

import { createClient } from "@supabase/supabase-js";

const ORG_ID = "319c11da-e288-4784-a6c2-07adfd0b9411";
const SEASON_ID = "177e2471-2c9d-4a3d-a4ba-d9dea19c8ffc";
const KODY_EMAIL = "kschmidt1210@gmail.com";
const SPREADSHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1GwapHZh4Ad7Z3-bncUg0ZwqOSTtvCZ14Yc-dhkAh-lQ/gviz/tq?tqx=out:csv&sheet=Logged%20Books";

// --- Types (minimal) ---
type BonusKey = "classics_1900" | "classics_1750" | "classics_pre1750" | "series" | "translation" | "birth_year" | "current_year" | "holiday_event" | "award_winner" | "new_country";
type DeductionKey = "graphic_novel" | "comics_manga" | "audiobook" | "reread" | "audiobook_reread";
type HometownBonusKey = "state_setting" | "state_name" | "city_name";

interface ScoringRulesConfig {
  base_points: { fiction: number; nonfiction: number };
  page_points: { first_100_rate: number; beyond_100_rate: number };
  bonuses: Record<BonusKey, number>;
  hometown_bonuses: Record<HometownBonusKey, number>;
  deductions: Record<DeductionKey, number>;
  season_bonuses: { genre_complete_pct: number; alphabet_13_pct: number; alphabet_26_pct: number };
  longest_road: { countries: [number, number, number]; series: [number, number, number] };
}

const DEFAULT_SCORING_CONFIG: ScoringRulesConfig = {
  base_points: { fiction: 0.71, nonfiction: 1.26 },
  page_points: { first_100_rate: 0.0028, beyond_100_rate: 0.01 },
  bonuses: { classics_1900: 0.072, classics_1750: 0.143, classics_pre1750: 0.286, series: 0.143, translation: 0.057, birth_year: 0.029, current_year: 0.057, holiday_event: 0.029, award_winner: 0.057, new_country: 0.057 },
  hometown_bonuses: { state_setting: 0.029, state_name: 0.0029, city_name: 0.0058 },
  deductions: { graphic_novel: 0.3, comics_manga: 0.2, audiobook: 0.75, reread: 0.5, audiobook_reread: 0.25 },
  season_bonuses: { genre_complete_pct: 0.1, alphabet_13_pct: 0.06, alphabet_26_pct: 0.14 },
  longest_road: { countries: [10, 7, 4], series: [8, 5, 3] },
};

// --- Scoring ---
function calculateBookScore(input: { pages: number; fiction: boolean; bonus_1: BonusKey | null; bonus_2: BonusKey | null; bonus_3: BonusKey | null; hometown_bonus: HometownBonusKey | null; deduction: DeductionKey | null; isNewCountry: boolean }, config: ScoringRulesConfig): number {
  const roundedPages = Math.round(input.pages / 50) * 50;
  const basePoints = input.fiction ? config.base_points.fiction : config.base_points.nonfiction;
  const pagePoints = Math.min(roundedPages, 100) * config.page_points.first_100_rate + Math.max(roundedPages - 100, 0) * config.page_points.beyond_100_rate;
  const preBonusTotal = basePoints + pagePoints;
  const regularBonusKeys = [input.bonus_1, input.bonus_2, input.bonus_3].filter((k): k is BonusKey => k !== null && k !== "new_country");
  const hasDeduction = input.deduction !== null;
  let totalBonuses = hasDeduction ? 0 : regularBonusKeys.reduce((sum, key) => sum + preBonusTotal * config.bonuses[key], 0);
  if (input.hometown_bonus && !hasDeduction) totalBonuses += preBonusTotal * config.hometown_bonuses[input.hometown_bonus];
  const postBonusTotal = preBonusTotal + totalBonuses;
  const afterDeduction = postBonusTotal * (input.deduction ? config.deductions[input.deduction] : 1);
  return afterDeduction * (input.isNewCountry ? 1 + config.bonuses.new_country : 1);
}

// --- CSV parser ---
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "", inQuotes = false, row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { current += '"'; i++; } else inQuotes = false; }
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(current); current = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(current); current = ""; if (row.some(c => c.trim())) rows.push(row); row = []; }
      else current += ch;
    }
  }
  row.push(current);
  if (row.some(c => c.trim())) rows.push(row);
  return rows;
}

// --- Mappings ---
const BONUS_MAP: Record<string, BonusKey> = { "classics (1900-present)": "classics_1900", "1750-1900": "classics_1750", "before 1750": "classics_pre1750", series: "series", translation: "translation", "birth year": "birth_year", "current year": "current_year", "relatable holiday or event": "holiday_event", "relatable holiday/event": "holiday_event", "award winner": "award_winner" };
const DEDUCTION_MAP: Record<string, DeductionKey> = { "graphic novel": "graphic_novel", "comics / manga": "comics_manga", "comics/manga": "comics_manga", audiobook: "audiobook", "re-read": "reread", "audiobook re-read": "audiobook_reread", "audiobook reread": "audiobook_reread" };
const HOMETOWN_MAP: Record<string, HometownBonusKey> = { '"florida" / "hometown state"': "state_name", '"tampa" / "hometown city"': "city_name", "set in florida / my state": "state_setting" };
const GENRE_ALIASES: Record<string, string> = { "mystery/thriller": "Mystery/Thriller", mystery: "Mystery/Thriller", thriller: "Mystery/Thriller", "legal thriller": "Mystery/Thriller", afrofuturism: "Afrofuturism", fantasy: "Fantasy", "portal fantasy": "Fantasy", "ya fantasy": "Fantasy", "urban fantasy": "Fantasy", romance: "Romance", "western romance": "Romance", "folklore / mythology": "Folklore/Mythology", "folklore/mythology": "Folklore/Mythology", "historical fiction": "Historical Fiction", memoir: "Memoir", "weird fiction": "Weird Fiction" };

function mapBonus(l: string): BonusKey | null { return BONUS_MAP[l.trim().toLowerCase()] ?? null; }
function mapDeduction(l: string): DeductionKey | null { return DEDUCTION_MAP[l.trim().toLowerCase()] ?? null; }
function mapHometown(l: string): HometownBonusKey | null { return HOMETOWN_MAP[l.trim().toLowerCase()] ?? null; }
function matchGenre(raw: string, gm: Map<string, string>): string | null {
  const l = raw.trim().toLowerCase(); if (!l) return null;
  return gm.get(l) ?? (GENRE_ALIASES[l] ? gm.get(GENRE_ALIASES[l].toLowerCase()) ?? null : null);
}
function parseDate(raw: string): string | null {
  const t = raw.trim(); if (!t) return null;
  const p = t.split(" ")[0].split("/");
  return p.length === 3 ? `${p[2]}-${p[0].padStart(2, "0")}-${p[1].padStart(2, "0")}` : null;
}

// --- Main ---
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1. Find Kody's real user ID
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const kodyUser = usersData?.users?.find((u: any) => u.email === KODY_EMAIL);
  if (!kodyUser) { console.error(`No user found with email ${KODY_EMAIL}`); process.exit(1); }
  console.log(`Found Kody's account: ${kodyUser.id} (${KODY_EMAIL})`);

  // 2. Check if entries already exist for this user+season
  const { data: existingEntries } = await supabase
    .from("book_entries")
    .select("id")
    .eq("user_id", kodyUser.id)
    .eq("season_id", SEASON_ID);
  if (existingEntries && existingEntries.length > 0) {
    console.log(`Kody already has ${existingEntries.length} entries in this season. Aborting to avoid duplicates.`);
    process.exit(0);
  }

  // 3. Fetch genres and scoring config
  const { data: genres } = await supabase.from("genres").select("id, name").eq("org_id", ORG_ID);
  const genreMap = new Map<string, string>();
  for (const g of genres ?? []) genreMap.set(g.name.toLowerCase(), g.id);

  const { data: scoringRules } = await supabase.from("scoring_rules").select("config").eq("org_id", ORG_ID).single();
  const config: ScoringRulesConfig = scoringRules?.config ?? DEFAULT_SCORING_CONFIG;

  // 4. Fetch CSV, filter to Kody's rows
  console.log("Fetching spreadsheet...");
  const csvText = await (await fetch(SPREADSHEET_CSV_URL)).text();
  const rows = parseCSV(csvText);
  rows.shift(); // remove header

  const kodyRows = rows.filter((r) => r[0]?.trim() === "Kody");
  console.log(`Found ${kodyRows.length} entries for Kody\n`);

  // 5. Insert each entry
  let created = 0, errors = 0;
  for (const row of kodyRows) {
    const title = row[2]?.trim();
    const pages = parseInt(row[3]?.trim(), 10);
    if (!title || isNaN(pages) || pages <= 0) { console.log(`  [skip] invalid: "${title}" ${pages}pp`); continue; }

    const isbn = row[1]?.trim() || null;
    const yearPublished = parseInt(row[4]?.trim(), 10) || null;
    const completed = row[5]?.trim().toLowerCase() !== "no";
    const fiction = row[6]?.trim().toLowerCase() !== "nonfiction";
    const seriesName = row[7]?.trim() || null;
    const country = row[9]?.trim() || null;
    const dateFinished = parseDate(row[10] || "");
    const ratingStr = row[11]?.trim();
    const rating = ratingStr ? parseFloat(ratingStr) : null;
    const hometownBonus = mapHometown(row[12] || "");
    const bonus1 = mapBonus(row[13] || "");
    const bonus2 = mapBonus(row[14] || "");
    const bonus3 = mapBonus(row[15] || "");
    const deduction = mapDeduction(row[16] || "");
    const genreId = matchGenre(row[8] || "", genreMap);
    const points = calculateBookScore({ pages, fiction, bonus_1: bonus1, bonus_2: bonus2, bonus_3: bonus3, hometown_bonus: hometownBonus, deduction, isNewCountry: false }, config);

    // Find existing book by ISBN or title
    let bookId: string;
    const bookQuery = isbn
      ? supabase.from("books").select("id").eq("isbn", isbn).single()
      : supabase.from("books").select("id").eq("title", title).single();
    const { data: existingBook } = await bookQuery;

    if (existingBook) {
      bookId = existingBook.id;
    } else {
      // Book was cascade-deleted or never created — re-create it
      const { data: newBook, error: bookErr } = await supabase
        .from("books")
        .insert({ isbn, title, author: "", pages, year_published: yearPublished, country })
        .select("id")
        .single();
      if (bookErr) { console.error(`  [error] book "${title}": ${bookErr.message}`); errors++; continue; }
      bookId = newBook!.id;
    }

    const { error: entryErr } = await supabase.from("book_entries").insert({
      season_id: SEASON_ID, user_id: kodyUser.id, book_id: bookId,
      completed, fiction, series_name: seriesName, genre_id: genreId,
      date_finished: dateFinished, rating: rating !== null && !isNaN(rating) ? rating : null,
      hometown_bonus: hometownBonus, bonus_1: bonus1, bonus_2: bonus2, bonus_3: bonus3,
      deduction, points,
    });

    if (entryErr) { console.error(`  [error] entry "${title}": ${entryErr.message}`); errors++; }
    else { console.log(`  [created] "${title}" — ${points.toFixed(2)}pts`); created++; }
  }

  console.log(`\nDone! Created ${created} entries, ${errors} errors.`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
