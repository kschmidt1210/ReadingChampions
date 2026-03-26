import {
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { getScoringRules } from "@/lib/queries/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoringRulesConfig } from "@/types/database";

export default async function AdminScoringPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const rules = await getScoringRules(currentOrg.id);
  const config = rules?.config as ScoringRulesConfig | undefined;

  if (!config)
    return <p className="text-gray-400">No scoring rules found.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Base Points</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Fiction:</span>{" "}
            <strong>{config.base_points.fiction}</strong>
          </div>
          <div>
            <span className="text-gray-500">Nonfiction:</span>{" "}
            <strong>{config.base_points.nonfiction}</strong>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Page Points</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">First 100:</span>{" "}
            <strong>{config.page_points.first_100_rate}/page</strong>
          </div>
          <div>
            <span className="text-gray-500">Beyond 100:</span>{" "}
            <strong>{config.page_points.beyond_100_rate}/page</strong>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Bonuses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.entries(config.bonuses).map(([key, pct]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
              <strong>+{((pct as number) * 100).toFixed(1)}%</strong>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Deductions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.entries(config.deductions).map(([key, mult]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
              <strong>&times;{mult as number}</strong>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">
        Editing scoring rules will be enabled through inline forms calling
        updateScoringRules action.
      </p>
    </div>
  );
}
