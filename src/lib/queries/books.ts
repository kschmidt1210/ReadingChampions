import { createClient } from "@/lib/supabase/server";
import type { BookReview } from "@/types/database";

export async function getUserBookEntries(seasonId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_entries")
    .select("*, book:books(*), review:book_reviews(*)")
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((entry) => ({
    ...entry,
    review: normalizeReview(entry.review),
  }));
}

export async function getSeasonEntries(seasonId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_entries")
    .select("*, book:books(*), profile:profiles(display_name)")
    .eq("season_id", seasonId);

  if (error) throw error;
  return data ?? [];
}

export async function getBookEntry(entryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_entries")
    .select("*, book:books(*), review:book_reviews(*)")
    .eq("id", entryId)
    .single();

  if (error) throw error;

  return {
    ...data,
    review: normalizeReview(data.review),
  };
}

export async function getBookEntryReview(bookEntryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_reviews")
    .select("*")
    .eq("book_entry_id", bookEntryId)
    .maybeSingle();

  if (error) throw error;
  return data as BookReview | null;
}

/**
 * Supabase returns a 1:1 relation as either an object or an array with one element.
 * Normalize to BookReview | null.
 */
function normalizeReview(review: unknown): BookReview | null {
  if (!review) return null;
  if (Array.isArray(review)) return (review[0] as BookReview) ?? null;
  return review as BookReview;
}
