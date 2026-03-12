import { createClient } from "@/lib/supabase/server";

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

export async function getOrgGenres(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("genres")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order");

  return data ?? [];
}
