import { createClient } from "@/lib/supabase/server";

export async function getUserBookEntries(seasonId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_entries")
    .select("*, book:books(*)")
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
    .select("*, book:books(*)")
    .eq("id", entryId)
    .single();

  if (error) throw error;
  return data;
}
