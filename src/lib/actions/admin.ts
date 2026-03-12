"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addGenre(orgId: string, name: string) {
  const supabase = await createClient();
  const { data: maxOrder } = await supabase
    .from("genres")
    .select("sort_order")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("genres")
    .insert({ org_id: orgId, name, sort_order: nextOrder });

  if (error) return { error: error.message };
  revalidatePath("/admin/genres");
}

export async function removeGenre(genreId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("genres").delete().eq("id", genreId);
  if (error) return { error: error.message };
  revalidatePath("/admin/genres");
}

export async function updateScoringRules(rulesId: string, config: any) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scoring_rules")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", rulesId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function resolveFlaggedEntry(flagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("flagged_entries")
    .update({ resolved: true, resolved_by: user?.id })
    .eq("id", flagId);

  if (error) return { error: error.message };
  revalidatePath("/admin/flagged");
}

export async function archiveSeason(seasonId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("seasons")
    .update({
      status: "archived",
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", seasonId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function createNewSeason(orgId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("seasons").insert({
    org_id: orgId,
    name,
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}
