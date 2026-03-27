import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getOrgMembers(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("*, profile:profiles(display_name)")
    .eq("org_id", orgId)
    .order("joined_at");
  return data ?? [];
}

export async function getOrgMembersWithEmail(orgId: string) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("org_members")
    .select("*, profile:profiles(display_name)")
    .eq("org_id", orgId)
    .order("joined_at");

  if (!members || members.length === 0) return [];

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers();
  const allUsers = usersData?.users ?? [];

  const emailMap = new Map<string, string>();
  for (const u of allUsers) {
    if (u.email) emailMap.set(u.id, u.email);
  }

  return members.map((m) => ({
    ...m,
    email: emailMap.get(m.user_id) ?? null,
  }));
}

export async function getFlaggedEntries(
  orgId: string,
  filter: "unresolved" | "resolved" | "all" = "unresolved"
) {
  const supabase = await createClient();
  let query = supabase
    .from("flagged_entries")
    .select(
      "*, book_entry:book_entries!inner(*, book:books(*), profile:profiles(display_name), season:seasons!inner(org_id))"
    )
    .eq("book_entry.season.org_id", orgId)
    .order("created_at", { ascending: false });

  if (filter === "unresolved") {
    query = query.eq("resolved", false);
  } else if (filter === "resolved") {
    query = query.eq("resolved", true);
  }

  const { data } = await query;
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
