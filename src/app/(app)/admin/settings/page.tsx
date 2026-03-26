import {
  getUserOrganizations,
  getCurrentOrg,
  getActiveSeason,
} from "@/lib/queries/organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const season = await getActiveSeason(currentOrg.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Competition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <p className="text-lg font-semibold">{currentOrg.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Invite Code
            </label>
            <p className="text-2xl font-mono font-bold tracking-widest">
              {currentOrg.invite_code}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Share this code or link: /join/{currentOrg.invite_code}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Season</CardTitle>
        </CardHeader>
        <CardContent>
          {season ? (
            <div>
              <p className="font-semibold">{season.name}</p>
              <p className="text-sm text-gray-500">
                Started: {season.start_date}
              </p>
              <p className="text-sm text-gray-500">Status: {season.status}</p>
            </div>
          ) : (
            <p className="text-gray-400">No active season</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
