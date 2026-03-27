"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calculateBookScore } from "@/lib/scoring";
import type { ScoringRulesConfig, BonusKey, DeductionKey, HometownBonusKey } from "@/types/database";

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

export async function createBookEntry(input: {
  seasonId: string;
  orgId: string;
  bookId: string;
  completed: boolean;
  fiction: boolean;
  seriesName: string | null;
  genreId: string | null;
  dateFinished: string | null;
  rating: number | null;
  hometownBonus: HometownBonusKey | null;
  bonus1: BonusKey | null;
  bonus2: BonusKey | null;
  bonus3: BonusKey | null;
  deduction: DeductionKey | null;
  pages: number;
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
      pages: input.pages,
      fiction: input.fiction,
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
      completed: input.completed,
      fiction: input.fiction,
      series_name: input.seriesName,
      genre_id: input.genreId,
      date_finished: input.dateFinished,
      rating: input.rating,
      hometown_bonus: input.hometownBonus,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      deduction: input.deduction,
      points: score.finalScore,
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

export async function updateBookEntry(
  entryId: string,
  orgId: string,
  seasonId: string,
  input: {
    completed: boolean;
    fiction: boolean;
    seriesName: string | null;
    genreId: string | null;
    dateFinished: string | null;
    rating: number | null;
    hometownBonus: HometownBonusKey | null;
    bonus1: BonusKey | null;
    bonus2: BonusKey | null;
    bonus3: BonusKey | null;
    deduction: DeductionKey | null;
    pages: number;
    country: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const [config, existingCountries] = await Promise.all([
    getScoringConfig(orgId),
    getExistingCountries(seasonId, user.id, entryId),
  ]);

  const isNewCountry = !!input.country && !existingCountries.has(input.country);

  const score = calculateBookScore(
    {
      pages: input.pages,
      fiction: input.fiction,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      hometown_bonus: input.hometownBonus,
      deduction: input.deduction,
      isNewCountry,
    },
    config
  );

  const { error } = await supabase
    .from("book_entries")
    .update({
      completed: input.completed,
      fiction: input.fiction,
      series_name: input.seriesName,
      genre_id: input.genreId,
      date_finished: input.dateFinished,
      rating: input.rating,
      hometown_bonus: input.hometownBonus,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      deduction: input.deduction,
      points: score.finalScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) throw error;

  revalidatePath("/", "layout");
}
