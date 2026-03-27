import {
  getUserOrganizations,
  getCurrentOrg,
  getActiveSeason,
  getArchivedSeasons,
  getSeasonEntryCount,
} from "@/lib/queries/organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OrgNameEditor,
  InviteCodeSection,
} from "@/components/admin-settings";
import { SeasonManager } from "@/components/season-manager";
import { DangerZone } from "@/components/danger-zone";

export default async function AdminSettingsPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const [season, archivedSeasons] = await Promise.all([
    getActiveSeason(currentOrg.id),
    getArchivedSeasons(currentOrg.id),
  ]);

  const activeEntryCount = season
    ? await getSeasonEntryCount(season.id)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Competition</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <OrgNameEditor orgId={currentOrg.id} initialName={currentOrg.name} />
          </div>
        </CardContent>
      </Card>

      <InviteCodeSection orgId={currentOrg.id} initialCode={currentOrg.invite_code} />

      <SeasonManager
        orgId={currentOrg.id}
        activeSeason={season}
        archivedSeasons={archivedSeasons}
        activeEntryCount={activeEntryCount}
      />

      <DangerZone orgId={currentOrg.id} orgName={currentOrg.name} />
    </div>
  );
}
