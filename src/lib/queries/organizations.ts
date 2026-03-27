import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function getUserOrganizations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(id, name, invite_code)")
    .eq("user_id", user.id);

  return (data ?? []).map((m: any) => ({
    id: m.organizations.id,
    name: m.organizations.name,
    invite_code: m.organizations.invite_code,
    role: m.role,
  }));
}

export async function getCurrentOrg(
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>
) {
  const cookieStore = await cookies();
  const savedOrgId = cookieStore.get("currentOrgId")?.value;
  if (savedOrgId) {
    const match = orgs.find((o) => o.id === savedOrgId);
    if (match) return match;
  }
  return orgs[0] ?? null;
}

export async function getActiveSeason(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .single();

  return data;
}

export async function getArchivedSeasons(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "archived")
    .order("end_date", { ascending: false });

  return data ?? [];
}

export async function getSeasonEntryCount(seasonId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("book_entries")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);

  return count ?? 0;
}

export async function getOrgGenres(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("genres")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order");

  return data ?? [];
}
