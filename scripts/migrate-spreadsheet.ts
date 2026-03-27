/**
 * Migration script: Google Sheets → Supabase
 *
 * Imports book entries from the "Logged Books" spreadsheet tab into the
 * Super Reader Championship app database.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-spreadsheet.ts
 *
 * Add --dry-run to preview without writing to the database.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ORG_ID = "319c11da-e288-4784-a6c2-07adfd0b9411";
const SEASON_ID = "177e2471-2c9d-4a3d-a4ba-d9dea19c8ffc";
const SPREADSHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1GwapHZh4Ad7Z3-bncUg0ZwqOSTtvCZ14Yc-dhkAh-lQ/gviz/tq?tqx=out:csv&sheet=Logged%20Books";

const DRY_RUN = process.argv.includes("--dry-run");

// Players who already have accounts — map spreadsheet name → existing email.
// These players will NOT get new accounts; the script links entries to their
// existing user instead.
const EXISTING_PLAYERS: Record<string, string> = {
  Kody: "kschmidt1210@gmail.com",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BonusKey =
  | "classics_1900"
  | "classics_1750"
  | "classics_pre1750"
  | "series"
  | "translation"
  | "birth_year"
  | "current_year"
  | "holiday_event"
  | "award_winner"
  | "new_country";

type DeductionKey =
  | "graphic_novel"
  | "comics_manga"
  | "audiobook"
  | "reread"
  | "audiobook_reread";

type HometownBonusKey = "state_setting" | "state_name" | "city_name";

interface ScoringRulesConfig {
  base_points: { fiction: number; nonfiction: number };
  page_points: { first_100_rate: number; beyond_100_rate: number };
  bonuses: Record<BonusKey, number>;
  hometown_bonuses: Record<HometownBonusKey, number>;
  deductions: Record<DeductionKey, number>;
  season_bonuses: {
    genre_complete_pct: number;
    alphabet_13_pct: number;
    alphabet_26_pct: number;
  };
  longest_road: { countries: [number, number, number]; series: [number, number, number] };
}

// ---------------------------------------------------------------------------
// Default scoring config (matches the app)
// ---------------------------------------------------------------------------

const DEFAULT_SCORING_CONFIG: ScoringRulesConfig = {
  base_points: { fiction: 0.71, nonfiction: 1.26 },
  page_points: { first_100_rate: 0.0028, beyond_100_rate: 0.01 },
  bonuses: {
    classics_1900: 0.072,
    classics_1750: 0.143,
    classics_pre1750: 0.286,
    series: 0.143,
    translation: 0.057,
    birth_year: 0.029,
    current_year: 0.057,
    holiday_event: 0.029,
    award_winner: 0.057,
    new_country: 0.057,
  },
  hometown_bonuses: { state_setting: 0.029, state_name: 0.0029, city_name: 0.0058 },
  deductions: {
    graphic_novel: 0.3,
    comics_manga: 0.2,
    audiobook: 0.75,
    reread: 0.5,
    audiobook_reread: 0.25,
  },
  season_bonuses: { genre_complete_pct: 0.1, alphabet_13_pct: 0.06, alphabet_26_pct: 0.14 },
  longest_road: { countries: [10, 7, 4], series: [8, 5, 3] },
};

// ---------------------------------------------------------------------------
// Scoring engine (inlined to avoid path alias issues)
// ---------------------------------------------------------------------------

function calculateBookScore(
  input: {
    pages: number;
    fiction: boolean;
    bonus_1: BonusKey | null;
    bonus_2: BonusKey | null;
    bonus_3: BonusKey | null;
    hometown_bonus: HometownBonusKey | null;
    deduction: DeductionKey | null;
    isNewCountry: boolean;
  },
  config: ScoringRulesConfig
): number {
  const roundedPages = Math.round(input.pages / 50) * 50;

  const basePoints = input.fiction
    ? config.base_points.fiction
    : config.base_points.nonfiction;

  const firstPages = Math.min(roundedPages, 100) * config.page_points.first_100_rate;
  const extraPages = Math.max(roundedPages - 100, 0) * config.page_points.beyond_100_rate;
  const pagePoints = firstPages + extraPages;
  const preBonusTotal = basePoints + pagePoints;

  const regularBonusKeys = [input.bonus_1, input.bonus_2, input.bonus_3].filter(
    (k): k is BonusKey => k !== null && k !== "new_country"
  );
  const hasDeduction = input.deduction !== null;

  let totalBonuses = hasDeduction
    ? 0
    : regularBonusKeys.reduce(
        (sum, key) => sum + preBonusTotal * config.bonuses[key],
        0
      );
  if (input.hometown_bonus && !hasDeduction) {
    totalBonuses += preBonusTotal * config.hometown_bonuses[input.hometown_bonus];
  }

  const postBonusTotal = preBonusTotal + totalBonuses;
  const afterDeduction =
    postBonusTotal * (input.deduction ? config.deductions[input.deduction] : 1);
  const newCountryMultiplier = input.isNewCountry ? 1 + config.bonuses.new_country : 1;

  return afterDeduction * newCountryMultiplier;
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
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
  // last row
  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Label → key mapping
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

function mapBonus(label: string): BonusKey | null {
  const key = BONUS_MAP[label.trim().toLowerCase()];
  return key ?? null;
}

function mapDeduction(label: string): DeductionKey | null {
  const key = DEDUCTION_MAP[label.trim().toLowerCase()];
  return key ?? null;
}

function mapHometown(label: string): HometownBonusKey | null {
  const key = HOMETOWN_MAP[label.trim().toLowerCase()];
  return key ?? null;
}

// ---------------------------------------------------------------------------
// Genre matching (fuzzy, case-insensitive)
// ---------------------------------------------------------------------------

const GENRE_ALIASES: Record<string, string> = {
  "mystery/thriller": "Mystery/Thriller",
  "mystery": "Mystery/Thriller",
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

function matchGenre(
  raw: string,
  genreMap: Map<string, string>
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Direct match by name (case-insensitive)
  const lower = trimmed.toLowerCase();
  const directId = genreMap.get(lower);
  if (directId) return directId;

  // Try alias
  const alias = GENRE_ALIASES[lower];
  if (alias) {
    const aliasId = genreMap.get(alias.toLowerCase());
    if (aliasId) return aliasId;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Handle "M/D/YYYY HH:MM:SS" or "M/D/YYYY"
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing env vars. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (DRY_RUN) console.log("\n=== DRY RUN MODE — no data will be written ===\n");

  // 1. Fetch CSV
  console.log("Fetching spreadsheet data...");
  const res = await fetch(SPREADSHEET_CSV_URL);
  if (!res.ok) {
    console.error(`Failed to fetch spreadsheet: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const csvText = await res.text();
  const rows = parseCSV(csvText);

  // Remove header row
  const header = rows.shift()!;
  console.log(`Parsed ${rows.length} data rows. Columns: ${header.length}`);

  // Column indices
  const COL = {
    playerName: 0,
    isbn: 1,
    title: 2,
    pages: 3,
    yearPublished: 4,
    completed: 5,
    fictionNf: 6,
    series: 7,
    genre: 8,
    country: 9,
    dateFinished: 10,
    rating: 11,
    hometownBonus: 12,
    bonus1: 13,
    bonus2: 14,
    bonus3: 15,
    deductions: 16,
  };

  // 2. Get org genres
  console.log("Fetching org genres...");
  const { data: genres } = await supabase
    .from("genres")
    .select("id, name")
    .eq("org_id", ORG_ID)
    .order("sort_order");

  const genreMap = new Map<string, string>();
  for (const g of genres ?? []) {
    genreMap.set(g.name.toLowerCase(), g.id);
  }
  console.log(`Found ${genreMap.size} genres: ${[...(genres ?? []).map((g: any) => g.name)].join(", ")}`);

  // 3. Get or fetch scoring config
  const { data: scoringRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .eq("org_id", ORG_ID)
    .single();

  const config: ScoringRulesConfig = scoringRules?.config ?? DEFAULT_SCORING_CONFIG;

  // 4. Collect unique players
  const playerNames = [...new Set(rows.map((r) => r[COL.playerName].trim()))].filter(Boolean);
  console.log(`\nFound ${playerNames.length} unique players: ${playerNames.join(", ")}`);

  // 5. Create users and org memberships
  const playerUserIds = new Map<string, string>();
  const playerEmails = new Map<string, string>();

  // Fetch all existing users once (avoid repeated API calls)
  const { data: allUsersData } = await supabase.auth.admin.listUsers();
  const allUsers = allUsersData?.users ?? [];

  for (const name of playerNames) {
    // Check if this player already has an account (e.g., the admin)
    const existingEmail = EXISTING_PLAYERS[name];

    if (existingEmail) {
      // Look up existing user by their real email
      const existing = allUsers.find((u: any) => u.email === existingEmail);
      if (existing) {
        console.log(`  [existing] "${name}" → ${existingEmail} (already registered)`);
        playerUserIds.set(name, existing.id);
        playerEmails.set(name, existingEmail);
        continue;
      } else {
        console.error(`  [error] "${name}" mapped to ${existingEmail} but no user found with that email!`);
        continue;
      }
    }

    // New player — generate a placeholder email
    const email = `${name.toLowerCase().replace(/[^a-z]/g, "")}@readingchampions.app`;
    playerEmails.set(name, email);

    // Check if already created (idempotent re-runs)
    const existing = allUsers.find((u: any) => u.email === email);

    if (existing) {
      console.log(`  [skip] User "${name}" already exists (${email})`);
      playerUserIds.set(name, existing.id);
    } else if (DRY_RUN) {
      console.log(`  [dry-run] Would create user "${name}" (${email})`);
      playerUserIds.set(name, `dry-run-${name}`);
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password: `TempPassword_${name}_2026!`,
        email_confirm: true, // marks as confirmed, no email sent
        user_metadata: { display_name: name },
      });

      if (error) {
        console.error(`  [error] Failed to create user "${name}": ${error.message}`);
        continue;
      }

      console.log(`  [created] User "${name}" → ${email}`);
      playerUserIds.set(name, newUser.user.id);

      // Add to org as player
      const { error: memberError } = await supabase.from("org_members").insert({
        org_id: ORG_ID,
        user_id: newUser.user.id,
        role: "player",
      });
      if (memberError) {
        console.error(`  [error] Failed to add "${name}" to org: ${memberError.message}`);
      }
    }
  }

  // 6. Process book entries
  console.log(`\nProcessing ${rows.length} book entries...`);
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const playerName = row[COL.playerName]?.trim();
    const title = row[COL.title]?.trim();
    const pagesStr = row[COL.pages]?.trim();
    const pages = parseInt(pagesStr, 10);

    if (!playerName || !title) {
      console.log(`  [skip] Row ${i + 2}: missing player name or title`);
      skipped++;
      continue;
    }

    if (isNaN(pages) || pages <= 0) {
      console.log(`  [skip] Row ${i + 2}: "${title}" — invalid page count "${pagesStr}"`);
      skipped++;
      continue;
    }

    const userId = playerUserIds.get(playerName);
    if (!userId) {
      console.log(`  [skip] Row ${i + 2}: "${title}" — no user for "${playerName}"`);
      skipped++;
      continue;
    }

    // Parse fields
    const isbn = row[COL.isbn]?.trim() || null;
    const yearPublished = parseInt(row[COL.yearPublished]?.trim(), 10) || null;
    const completedRaw = row[COL.completed]?.trim().toLowerCase();
    const completed = completedRaw !== "no";
    const fictionRaw = row[COL.fictionNf]?.trim().toLowerCase();
    const fiction = fictionRaw !== "nonfiction";
    const seriesName = row[COL.series]?.trim() || null;
    const genreRaw = row[COL.genre]?.trim() || "";
    const country = row[COL.country]?.trim() || null;
    const dateFinished = parseDate(row[COL.dateFinished] || "");
    const ratingStr = row[COL.rating]?.trim();
    const rating = ratingStr ? parseFloat(ratingStr) : null;

    // Map bonuses/deductions
    const hometownBonus = mapHometown(row[COL.hometownBonus] || "");
    const bonus1 = mapBonus(row[COL.bonus1] || "");
    const bonus2 = mapBonus(row[COL.bonus2] || "");
    const bonus3 = mapBonus(row[COL.bonus3] || "");
    const deduction = mapDeduction(row[COL.deductions] || "");

    // Match genre
    const genreId = matchGenre(genreRaw, genreMap);

    // Calculate score
    const points = calculateBookScore(
      {
        pages,
        fiction,
        bonus_1: bonus1,
        bonus_2: bonus2,
        bonus_3: bonus3,
        hometown_bonus: hometownBonus,
        deduction,
        isNewCountry: false,
      },
      config
    );

    if (DRY_RUN) {
      console.log(
        `  [dry-run] ${playerName}: "${title}" — ${pages}pp, ${fiction ? "F" : "NF"}, ${points.toFixed(2)}pts` +
          (genreId ? ` [${genreRaw}]` : genreRaw ? ` [${genreRaw} → no match]` : "") +
          (deduction ? ` (${deduction})` : "") +
          ([bonus1, bonus2, bonus3].filter(Boolean).length
            ? ` +${[bonus1, bonus2, bonus3].filter(Boolean).join(",")}`
            : "") +
          (hometownBonus ? ` +HT:${hometownBonus}` : "")
      );
      created++;
      continue;
    }

    // Upsert book
    let bookId: string;
    if (isbn) {
      // Try to find by ISBN first
      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("isbn", isbn)
        .single();

      if (existingBook) {
        bookId = existingBook.id;
      } else {
        const { data: newBook, error: bookError } = await supabase
          .from("books")
          .insert({
            isbn,
            title,
            author: "",
            pages,
            year_published: yearPublished,
            country,
          })
          .select("id")
          .single();

        if (bookError) {
          console.error(`  [error] Row ${i + 2}: Failed to create book "${title}": ${bookError.message}`);
          errors++;
          continue;
        }
        bookId = newBook!.id;
      }
    } else {
      // No ISBN — create by title match or new
      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("title", title)
        .single();

      if (existingBook) {
        bookId = existingBook.id;
      } else {
        const { data: newBook, error: bookError } = await supabase
          .from("books")
          .insert({
            title,
            author: "",
            pages,
            year_published: yearPublished,
            country,
          })
          .select("id")
          .single();

        if (bookError) {
          console.error(`  [error] Row ${i + 2}: Failed to create book "${title}": ${bookError.message}`);
          errors++;
          continue;
        }
        bookId = newBook!.id;
      }
    }

    // Create book entry
    const { error: entryError } = await supabase.from("book_entries").insert({
      season_id: SEASON_ID,
      user_id: userId,
      book_id: bookId,
      completed,
      fiction,
      series_name: seriesName,
      genre_id: genreId,
      date_finished: dateFinished,
      rating: rating !== null && !isNaN(rating) ? rating : null,
      hometown_bonus: hometownBonus,
      bonus_1: bonus1,
      bonus_2: bonus2,
      bonus_3: bonus3,
      deduction,
      points,
    });

    if (entryError) {
      console.error(
        `  [error] Row ${i + 2}: Failed to create entry for "${title}": ${entryError.message}`
      );
      errors++;
    } else {
      created++;
    }
  }

  // 7. Summary
  console.log("\n=== Migration Summary ===");
  console.log(`Players: ${playerUserIds.size}`);
  console.log(`Entries created: ${created}`);
  console.log(`Entries skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (!DRY_RUN) {
    console.log("\n=== Player Login Info ===");
    console.log("Players should use 'Forgot Password' at the login page to set their password.");
    console.log("Their email addresses are:\n");
    for (const [name, email] of playerEmails) {
      console.log(`  ${name.padEnd(15)} → ${email}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
