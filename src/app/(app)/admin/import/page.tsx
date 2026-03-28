import { createClient } from "@/lib/supabase/server";
import {
  getUserOrganizations,
  getCurrentOrg,
  getActiveSeason,
} from "@/lib/queries/organizations";
import { getOrgMembers } from "@/lib/queries/admin";
import { ImportManager } from "@/components/import-manager";

export default async function AdminImportPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const supabase = await createClient();
  const [season, members, orgData] = await Promise.all([
    getActiveSeason(currentOrg.id),
    getOrgMembers(currentOrg.id),
    supabase
      .from("organizations")
      .select("spreadsheet_url")
      .eq("id", currentOrg.id)
      .single(),
  ]);

  const memberList = members.map((m: any) => ({
    userId: m.user_id,
    displayName: (m.profile as any)?.display_name ?? "(unnamed)",
    role: m.role,
  }));

  return (
    <ImportManager
      orgId={currentOrg.id}
      seasonId={season?.id ?? null}
      seasonName={season?.name ?? null}
      savedSheetUrl={orgData.data?.spreadsheet_url ?? null}
      members={memberList}
    />
  );
}
