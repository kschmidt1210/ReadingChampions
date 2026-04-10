"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { calculateBookScore } from "@/lib/scoring";
import type { ScoringRulesConfig } from "@/types/database";
import {
  parseCSV,
  parseSheetId,
  buildCsvExportUrl,
  parseSheetRow,
  detectPointsColumn,
  type ParsedSheetRow,
} from "@/lib/sheet-import";
import { searchByISBN } from "@/lib/books-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" as const, supabase, user: null };

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Only admins can perform this action" as const, supabase, user: null };
  }

  return { error: null, supabase, user };
}

async function getOrgScoringConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
): Promise<ScoringRulesConfig | null> {
  const { data: orgRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .eq("org_id", orgId)
    .single();
  if (orgRules) return orgRules.config as ScoringRulesConfig;

  const { data: globalRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .is("org_id", null)
    .single();
  return globalRules ? (globalRules.config as ScoringRulesConfig) : null;
}

const EXPECTED_HEADERS = ["title", "pages", "genre", "country", "rating"];

function looksLikeBookEntryTab(header: string[]): boolean {
  const lowerHeaders = header.map((h) => h.trim().toLowerCase());
  return EXPECTED_HEADERS.every((expected) =>
    lowerHeaders.some((h) => h.includes(expected))
  );
}

async function fetchPlayerTab(
  sheetId: string,
  playerName: string
): Promise<{ rows: string[][]; header: string[] } | null> {
  const url = buildCsvExportUrl(sheetId, playerName);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return null;
    const header = rows.shift()!;
    if (!looksLikeBookEntryTab(header)) return null;
    return { rows, header };
  } catch {
    return null;
  }
}

function buildGenreMap(genres: Array<{ id: string; name: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of genres) {
    map.set(g.name.toLowerCase(), g.id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Open Library ISBN lookup (with in-memory cache & rate-limit delay)
// ---------------------------------------------------------------------------

interface BookMeta {
  cover_url: string | null;
  author: string;
}

async function fetchBookMetaByISBN(
  isbn: string,
  cache: Map<string, BookMeta>
): Promise<BookMeta> {
  const cached = cache.get(isbn);
  if (cached) return cached;

  try {
    const result = await searchByISBN(isbn);
    const meta: BookMeta = result
      ? { cover_url: result.cover_url, author: result.author }
      : { cover_url: null, author: "" };
    cache.set(isbn, meta);
    // Small delay to stay within Open Library rate limits
    await new Promise((r) => setTimeout(r, 100));
    return meta;
  } catch {
    const fallback: BookMeta = { cover_url: null, author: "" };
    cache.set(isbn, fallback);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 1. Save sheet URL
// ---------------------------------------------------------------------------

export async function saveSheetUrl(orgId: string, sheetUrl: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const trimmed = sheetUrl.trim();
  if (trimmed && !parseSheetId(trimmed)) {
    return { error: "Could not parse a Google Sheet ID from that URL" };
  }

  const { error, data } = await supabase
    .from("organizations")
    .update({ spreadsheet_url: trimmed || null })
    .eq("id", orgId)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Failed to update — check that the database migration has been applied" };
  }
  revalidatePath("/admin/import");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 2. Preview (fetch + parse + compare scores, no writes)
// ---------------------------------------------------------------------------

export interface PreviewPlayer {
  name: string;
  userId: string;
  tabFound: boolean;
  rowCount: number;
}

export interface ScoreMismatch {
  player: string;
  title: string;
  sheetPoints: number;
  appPoints: number;
  diff: number;
}

export interface ParseError {
  player: string;
  rowIndex: number;
  reason: string;
}

export interface PreviewResult {
  players: PreviewPlayer[];
  totalRows: number;
  mismatches: ScoreMismatch[];
  parseErrors: ParseError[];
}

export async function previewSheetImport(
  orgId: string,
  seasonId: string
): Promise<{ error: string } | PreviewResult> {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  // Get sheet URL
  const { data: org } = await supabase
    .from("organizations")
    .select("spreadsheet_url")
    .eq("id", orgId)
    .single();

  if (!org?.spreadsheet_url) return { error: "No spreadsheet URL configured" };

  const sheetId = parseSheetId(org.spreadsheet_url);
  if (!sheetId) return { error: "Invalid spreadsheet URL" };

  // Get org members
  const { data: members } = await supabase
    .from("org_members")
    .select("user_id, profile:profiles(display_name)")
    .eq("org_id", orgId);

  if (!members || members.length === 0) return { error: "No org members found" };

  // Get genres + scoring config
  const { data: genres } = await supabase
    .from("genres")
    .select("id, name")
    .eq("org_id", orgId);
  const genreMap = buildGenreMap(genres ?? []);

  const config = await getOrgScoringConfig(supabase, orgId);
  if (!config) return { error: "No scoring rules found" };

  const players: PreviewPlayer[] = [];
  const mismatches: ScoreMismatch[] = [];
  const parseErrors: ParseError[] = [];
  let totalRows = 0;

  for (const member of members) {
    const displayName = (member.profile as any)?.display_name as string | undefined;
    if (!displayName) {
      players.push({ name: "(unnamed)", userId: member.user_id, tabFound: false, rowCount: 0 });
      continue;
    }

    const tabData = await fetchPlayerTab(sheetId, displayName);
    if (!tabData) {
      players.push({ name: displayName, userId: member.user_id, tabFound: false, rowCount: 0 });
      continue;
    }

    const pointsCol = detectPointsColumn(tabData.header);
    let rowCount = 0;
    const seenCountries = new Set<string>();

    for (let i = 0; i < tabData.rows.length; i++) {
      const row = tabData.rows[i];
      const result = parseSheetRow(row, genreMap, pointsCol);

      if ("skip" in result) continue;
      if ("error" in result) {
        parseErrors.push({ player: displayName, rowIndex: i + 2, reason: result.error });
        continue;
      }

      rowCount++;
      const p = result.parsed;
      const country = p.country;
      const isNewCountry = p.completed && !!country && !seenCountries.has(country);
      if (p.completed && country) seenCountries.add(country);

      const score = calculateBookScore(
        {
          pages: p.pages,
          fiction: p.fiction,
          completed: p.completed,
          bonus_1: p.bonus1,
          bonus_2: p.bonus2,
          bonus_3: p.bonus3,
          hometown_bonus: p.hometownBonus,
          deduction: p.deduction,
          isNewCountry,
        },
        config
      );

      if (p.sheetPoints !== null && Math.abs(p.sheetPoints - score.finalScore) > 0.5) {
        mismatches.push({
          player: displayName,
          title: p.title,
          sheetPoints: p.sheetPoints,
          appPoints: Math.round(score.finalScore * 100) / 100,
          diff: Math.round((p.sheetPoints - score.finalScore) * 100) / 100,
        });
      }
    }

    totalRows += rowCount;
    players.push({ name: displayName, userId: member.user_id, tabFound: true, rowCount });
  }

  return { players, totalRows, mismatches, parseErrors };
}

// ---------------------------------------------------------------------------
// 3. Import (wipe + insert)
// ---------------------------------------------------------------------------

export interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
  details: string[];
}

export async function importFromSheet(
  orgId: string,
  seasonId: string,
  options: { mode: "all" } | { mode: "player"; userId: string }
): Promise<{ error: string } | ImportResult> {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  // Get sheet URL
  const { data: org } = await supabase
    .from("organizations")
    .select("spreadsheet_url")
    .eq("id", orgId)
    .single();

  if (!org?.spreadsheet_url) return { error: "No spreadsheet URL configured" };
  const sheetId = parseSheetId(org.spreadsheet_url);
  if (!sheetId) return { error: "Invalid spreadsheet URL" };

  // Get genres + scoring config
  const { data: genres } = await supabase
    .from("genres")
    .select("id, name")
    .eq("org_id", orgId);
  const genreMap = buildGenreMap(genres ?? []);

  const config = await getOrgScoringConfig(supabase, orgId);
  if (!config) return { error: "No scoring rules found" };

  // Determine which members to import
  let membersToImport: Array<{ userId: string; displayName: string }>;

  if (options.mode === "all") {
    const { data: members } = await supabase
      .from("org_members")
      .select("user_id, profile:profiles(display_name)")
      .eq("org_id", orgId);

    membersToImport = (members ?? [])
      .map((m) => ({
        userId: m.user_id,
        displayName: ((m.profile as any)?.display_name as string) ?? "",
      }))
      .filter((m) => m.displayName);
  } else {
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", options.userId)
      .single();

    if (!profile?.display_name) return { error: "Player not found" };
    membersToImport = [{ userId: options.userId, displayName: profile.display_name }];
  }

  // --- Wipe phase ---
  if (options.mode === "all") {
    // Delete flagged entries for this season's book entries
    const { data: seasonEntries } = await admin
      .from("book_entries")
      .select("id")
      .eq("season_id", seasonId);

    if (seasonEntries && seasonEntries.length > 0) {
      const entryIds = seasonEntries.map((e) => e.id);
      await admin.from("flagged_entries").delete().in("book_entry_id", entryIds);
    }

    await admin.from("book_entries").delete().eq("season_id", seasonId);
  } else {
    const { data: playerEntries } = await admin
      .from("book_entries")
      .select("id")
      .eq("season_id", seasonId)
      .eq("user_id", options.userId);

    if (playerEntries && playerEntries.length > 0) {
      const entryIds = playerEntries.map((e) => e.id);
      await admin.from("flagged_entries").delete().in("book_entry_id", entryIds);
    }

    await admin
      .from("book_entries")
      .delete()
      .eq("season_id", seasonId)
      .eq("user_id", options.userId);
  }

  // --- Import phase ---
  let created = 0;
  let skipped = 0;
  let errors = 0;
  const details: string[] = [];
  const isbnMetaCache = new Map<string, BookMeta>();

  for (const member of membersToImport) {
    const tabData = await fetchPlayerTab(sheetId, member.displayName);
    if (!tabData) {
      details.push(`${member.displayName}: tab not found in sheet`);
      continue;
    }

    const pointsCol = detectPointsColumn(tabData.header);
    const seenCountries = new Set<string>();

    for (let i = 0; i < tabData.rows.length; i++) {
      const row = tabData.rows[i];
      const result = parseSheetRow(row, genreMap, pointsCol);

      if ("skip" in result) continue;
      if ("error" in result) {
        skipped++;
        details.push(`${member.displayName} row ${i + 2}: ${result.error}`);
        continue;
      }

      const p = result.parsed;
      const country = p.country;
      const isNewCountry = p.completed && !!country && !seenCountries.has(country);
      if (p.completed && country) seenCountries.add(country);

      const score = calculateBookScore(
        {
          pages: p.pages,
          fiction: p.fiction,
          completed: p.completed,
          bonus_1: p.bonus1,
          bonus_2: p.bonus2,
          bonus_3: p.bonus3,
          hometown_bonus: p.hometownBonus,
          deduction: p.deduction,
          isNewCountry,
        },
        config
      );

      // Upsert book (look up cover & author from Open Library when ISBN is available)
      let bookId: string;
      if (p.isbn) {
        const meta = await fetchBookMetaByISBN(p.isbn, isbnMetaCache);

        const { data: existingBook } = await admin
          .from("books")
          .select("id, cover_url, author")
          .eq("isbn", p.isbn)
          .single();

        if (existingBook) {
          bookId = existingBook.id;
          // Backfill cover/author on existing books that are missing them
          const updates: Record<string, string> = {};
          if (!existingBook.cover_url && meta.cover_url) updates.cover_url = meta.cover_url;
          if ((!existingBook.author || existingBook.author === "") && meta.author) updates.author = meta.author;
          if (Object.keys(updates).length > 0) {
            await admin.from("books").update(updates).eq("id", bookId);
          }
        } else {
          const { data: newBook, error: bookError } = await admin
            .from("books")
            .insert({
              isbn: p.isbn,
              title: p.title,
              author: meta.author || "",
              pages: p.pages,
              year_published: p.yearPublished,
              country: p.country,
              cover_url: meta.cover_url,
            })
            .select("id")
            .single();

          if (bookError) {
            errors++;
            details.push(`${member.displayName}: book "${p.title}" failed: ${bookError.message}`);
            continue;
          }
          bookId = newBook!.id;
        }
      } else {
        const { data: existingBook } = await admin
          .from("books")
          .select("id")
          .eq("title", p.title)
          .single();

        if (existingBook) {
          bookId = existingBook.id;
        } else {
          const { data: newBook, error: bookError } = await admin
            .from("books")
            .insert({
              title: p.title,
              author: "",
              pages: p.pages,
              year_published: p.yearPublished,
              country: p.country,
            })
            .select("id")
            .single();

          if (bookError) {
            errors++;
            details.push(`${member.displayName}: book "${p.title}" failed: ${bookError.message}`);
            continue;
          }
          bookId = newBook!.id;
        }
      }

      // Insert book entry
      const { error: entryError } = await admin.from("book_entries").insert({
        season_id: seasonId,
        user_id: member.userId,
        book_id: bookId,
        completed: p.completed,
        fiction: p.fiction,
        series_name: p.seriesName,
        genre_id: p.genreId,
        genre_name: p.genreName,
        date_finished: p.dateFinished,
        rating: p.rating !== null && !isNaN(p.rating) ? p.rating : null,
        hometown_bonus: p.hometownBonus,
        bonus_1: p.bonus1,
        bonus_2: p.bonus2,
        bonus_3: p.bonus3,
        deduction: p.deduction,
        points: score.finalScore,
      });

      if (entryError) {
        errors++;
        details.push(`${member.displayName}: entry "${p.title}" failed: ${entryError.message}`);
      } else {
        created++;
      }
    }
  }

  revalidatePath("/", "layout");
  return { created, skipped, errors, details };
}
