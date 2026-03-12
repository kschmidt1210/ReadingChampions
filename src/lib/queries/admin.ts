import { createClient } from "@/lib/supabase/server";

export async function getOrgMembers(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("*, profile:profiles(display_name)")
    .eq("org_id", orgId)
    .order("joined_at");
  return data ?? [];
}

export async function getFlaggedEntries(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("flagged_entries")
    .select(
      "*, book_entry:book_entries(*, book:books(*), profile:profiles(display_name))"
    )
    .eq("resolved", false);
  return data ?? [];
}

export async function getScoringRules(orgId: string) {
  const supabase = await createClient();
  const { data: orgRules } = await supabase
    .from("scoring_rules")
    .select("*")
    .eq("org_id", orgId)
    .single();
  if (orgRules) return orgRules;
  const { data: globalRules } = await supabase
    .from("scoring_rules")
    .select("*")
    .is("org_id", null)
    .single();
  return globalRules;
}
