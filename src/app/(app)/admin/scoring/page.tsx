import {
  getUserOrganizations,
  getCurrentOrg,
  getActiveSeason,
  getSeasonEntryCount,
} from "@/lib/queries/organizations";
import { getScoringRules } from "@/lib/queries/admin";
import { ScoringEditor } from "@/components/scoring-editor";
import type { ScoringRulesConfig } from "@/types/database";

export default async function AdminScoringPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const [rules, season] = await Promise.all([
    getScoringRules(currentOrg.id),
    getActiveSeason(currentOrg.id),
  ]);

  const config = rules?.config as ScoringRulesConfig | undefined;

  if (!rules || !config)
    return <p className="text-muted-foreground">No scoring rules found.</p>;

  const entryCount = season ? await getSeasonEntryCount(season.id) : 0;

  return (
    <ScoringEditor
      orgId={currentOrg.id}
      rulesId={rules.id}
      initialConfig={config}
      seasonId={season?.id ?? null}
      entryCount={entryCount}
    />
  );
}
