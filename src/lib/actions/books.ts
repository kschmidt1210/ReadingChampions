"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { calculateBookScore } from "@/lib/scoring";
import type { ScoringRulesConfig, BonusKey, BookEntryStatus, DeductionKey, HometownBonusKey } from "@/types/database";

async function getExistingCountries(
  seasonId: string,
  userId: string,
  excludeEntryId?: string
): Promise<Set<string>> {
  const supabase = await createClient();
  let query = supabase
    .from("book_entries")
    .select("book:books(country)")
    .eq("season_id", seasonId)
    .eq("user_id", userId);

  if (excludeEntryId) {
    query = query.neq("id", excludeEntryId);
  }

  const { data } = await query;
  const countries = new Set<string>();
  for (const entry of data ?? []) {
    const country = (entry.book as any)?.country;
    if (country) countries.add(country);
  }
  return countries;
}

async function getScoringConfig(orgId: string): Promise<ScoringRulesConfig> {
  const supabase = await createClient();

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

  if (!globalRules) throw new Error("No scoring rules found");
  return globalRules.config as ScoringRulesConfig;
}

export async function getUserSeasonCountries(seasonId: string): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const countries = await getExistingCountries(seasonId, user.id);
  return [...countries];
}

export async function getSeasonSeriesNames(seasonId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("book_entries")
    .select("series_name")
    .eq("season_id", seasonId)
    .not("series_name", "is", null);

  if (!data) return [];

  const unique = new Set<string>();
  for (const row of data) {
    const name = row.series_name?.trim();
    if (name) unique.add(name);
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
}

function normalizeSeriesName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed || null;
}

export async function findOrCreateBook(bookData: {
  isbn: string | null;
  title: string;
  author: string;
  pages: number;
  year_published: number | null;
  country: string | null;
  cover_url: string | null;
}) {
  const supabase = await createClient();

  if (bookData.isbn) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("isbn", bookData.isbn)
      .single();

    if (existing) return existing.id;
  }

  const { data, error } = await supabase
    .from("books")
    .insert(bookData)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && bookData.isbn) {
      const { data: existing } = await supabase
        .from("books")
        .select("id")
        .eq("isbn", bookData.isbn)
        .single();
      if (existing) return existing.id;
    }
    throw error;
  }

  return data.id;
}

function scoringPagesForStatus(
  status: BookEntryStatus,
  bookPages: number,
  pagesRead: number | null,
): number {
  if (status === "did_not_finish") return pagesRead ?? 0;
  return bookPages;
}

function scoringCompletedForStatus(status: BookEntryStatus): boolean {
  return status === "completed" || status === "reading";
}

export async function createBookEntry(input: {
  seasonId: string;
  orgId: string;
  bookId: string;
  status: BookEntryStatus;
  fiction: boolean;
  seriesName: string | null;
  genreId: string | null;
  genreName: string | null;
  dateFinished: string | null;
  rating: number | null;
  hometownBonus: HometownBonusKey | null;
  bonus1: BonusKey | null;
  bonus2: BonusKey | null;
  bonus3: BonusKey | null;
  deduction: DeductionKey | null;
  pages: number;
  pagesRead: number | null;
  country: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const [config, existingCountries] = await Promise.all([
    getScoringConfig(input.orgId),
    getExistingCountries(input.seasonId, user.id),
  ]);

  const isNewCountry = !!input.country && !existingCountries.has(input.country);

  const score = calculateBookScore(
    {
      pages: scoringPagesForStatus(input.status, input.pages, input.pagesRead),
      fiction: input.fiction,
      completed: scoringCompletedForStatus(input.status),
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      hometown_bonus: input.hometownBonus,
      deduction: input.deduction,
      isNewCountry,
    },
    config
  );

  const { data, error } = await supabase
    .from("book_entries")
    .insert({
      season_id: input.seasonId,
      user_id: user.id,
      book_id: input.bookId,
      status: input.status,
      fiction: input.fiction,
      series_name: normalizeSeriesName(input.seriesName),
      genre_id: input.genreId,
      genre_name: input.genreName,
      date_finished: input.dateFinished,
      rating: input.rating,
      hometown_bonus: input.hometownBonus,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      deduction: input.deduction,
      points: score.finalScore,
      pages_read: input.pagesRead,
    })
    .select("id")
    .single();

  if (error) throw error;

  await checkAndFlagEntry(data.id, input.seasonId, score.finalScore);

  revalidatePath("/", "layout");
  return data.id;
}

async function checkAndFlagEntry(
  entryId: string,
  seasonId: string,
  points: number
) {
  const supabase = await createClient();

  const { data: allEntries } = await supabase
    .from("book_entries")
    .select("points")
    .eq("season_id", seasonId);

  if (allEntries && allEntries.length >= 3) {
    const pointValues = allEntries.map((e) => Number(e.points));
    const mean = pointValues.reduce((a, b) => a + b, 0) / pointValues.length;
    const stdDev = Math.sqrt(
      pointValues.reduce((sum, p) => sum + (p - mean) ** 2, 0) /
        pointValues.length
    );

    if (points > mean + 2 * stdDev) {
      await supabase.from("flagged_entries").insert({
        book_entry_id: entryId,
        reason: "high_points",
      });
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entry } = await supabase
    .from("book_entries")
    .select("book_id")
    .eq("id", entryId)
    .single();

  if (entry && user) {
    const { data: duplicates } = await supabase
      .from("book_entries")
      .select("id")
      .eq("season_id", seasonId)
      .eq("user_id", user.id)
      .eq("book_id", entry.book_id)
      .neq("id", entryId);

    if (duplicates && duplicates.length > 0) {
      await supabase.from("flagged_entries").insert({
        book_entry_id: entryId,
        reason: "duplicate_book",
      });
    }
  }
}

async function requireOwnerOrAdmin(
  entryId: string,
  orgId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: entry } = await supabase
    .from("book_entries")
    .select("user_id")
    .eq("id", entryId)
    .single();

  if (!entry) throw new Error("Entry not found");

  if (entry.user_id !== user.id) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized to modify this entry");
    }
  }

  const isOwner = entry.user_id === user.id;
  return { supabase, user, entryOwnerId: entry.user_id, isOwner };
}

export async function updateBookEntry(
  entryId: string,
  orgId: string,
  seasonId: string,
  input: {
    status: BookEntryStatus;
    fiction: boolean;
    seriesName: string | null;
    genreId: string | null;
    genreName: string | null;
    dateFinished: string | null;
    rating: number | null;
    hometownBonus: HometownBonusKey | null;
    bonus1: BonusKey | null;
    bonus2: BonusKey | null;
    bonus3: BonusKey | null;
    deduction: DeductionKey | null;
    pages: number;
    pagesRead: number | null;
    country: string | null;
  }
) {
  const { entryOwnerId, isOwner } = await requireOwnerOrAdmin(entryId, orgId);

  const [config, existingCountries] = await Promise.all([
    getScoringConfig(orgId),
    getExistingCountries(seasonId, entryOwnerId, entryId),
  ]);

  const isNewCountry = !!input.country && !existingCountries.has(input.country);

  const score = calculateBookScore(
    {
      pages: scoringPagesForStatus(input.status, input.pages, input.pagesRead),
      fiction: input.fiction,
      completed: scoringCompletedForStatus(input.status),
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      hometown_bonus: input.hometownBonus,
      deduction: input.deduction,
      isNewCountry,
    },
    config
  );

  const supabase = isOwner ? await createClient() : createAdminClient();
  if (!supabase) throw new Error("Admin client not configured");
  const { error } = await supabase
    .from("book_entries")
    .update({
      status: input.status,
      fiction: input.fiction,
      series_name: normalizeSeriesName(input.seriesName),
      genre_id: input.genreId,
      genre_name: input.genreName,
      date_finished: input.dateFinished,
      rating: input.rating,
      hometown_bonus: input.hometownBonus,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      deduction: input.deduction,
      points: score.finalScore,
      pages_read: input.pagesRead,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function deleteBookEntry(entryId: string, orgId: string) {
  const { isOwner } = await requireOwnerOrAdmin(entryId, orgId);

  const supabase = isOwner ? await createClient() : createAdminClient();
  if (!supabase) throw new Error("Admin client not configured");

  const { error: flagError } = await supabase
    .from("flagged_entries")
    .delete()
    .eq("book_entry_id", entryId);

  if (flagError) throw flagError;

  const { error } = await supabase
    .from("book_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw error;

  revalidatePath("/", "layout");
}
