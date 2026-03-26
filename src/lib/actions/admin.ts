"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function addGenre(orgId: string, name: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

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

export async function removeGenre(orgId: string, genreId: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("genres")
    .delete()
    .eq("id", genreId)
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/admin/genres");
}

export async function updateScoringRules(orgId: string, rulesId: string, config: Record<string, unknown>) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("scoring_rules")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", rulesId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function resolveFlaggedEntry(orgId: string, flagId: string) {
  const { error: authError, supabase, user } = await requireAdmin(orgId);
  if (authError || !user) return { error: authError ?? "Not authenticated" };

  const { error } = await supabase
    .from("flagged_entries")
    .update({ resolved: true, resolved_by: user.id })
    .eq("id", flagId);

  if (error) return { error: error.message };
  revalidatePath("/admin/flagged");
}

export async function archiveSeason(orgId: string, seasonId: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("seasons")
    .update({
      status: "archived",
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", seasonId)
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function createNewSeason(orgId: string, name: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  // Archive existing active season first
  await supabase
    .from("seasons")
    .update({
      status: "archived",
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("org_id", orgId)
    .eq("status", "active");

  const { error } = await supabase.from("seasons").insert({
    org_id: orgId,
    name,
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
  });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}
