import { createClient } from "@/lib/supabase/server";
import {
  getUserOrganizations,
  getCurrentOrg,
  getActiveSeason,
  getOrgNotes,
} from "@/lib/queries/organizations";
import { getScoringRules } from "@/lib/queries/admin";
import { RulesPointsView } from "@/components/rules-points-view";
import type { ScoringRulesConfig } from "@/types/database";

export default async function RulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg)
    return (
      <div className="p-8 text-center">Join a competition to get started!</div>
    );

  const season = await getActiveSeason(currentOrg.id);
  const [rules, notes] = await Promise.all([
    getScoringRules(currentOrg.id),
    getOrgNotes(currentOrg.id),
  ]);

  const config = rules?.config as ScoringRulesConfig | undefined;

  if (!config)
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground font-medium">Scoring rules haven&apos;t been set up yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Ask your competition organizer to configure the scoring rules.</p>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Rules & Points</h1>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {currentOrg.name}
          {season ? <> &middot; {season.name}</> : null}
        </p>
      </div>
      <RulesPointsView
        orgId={currentOrg.id}
        config={config}
        notes={notes}
        isAdmin={currentOrg.role === "admin"}
      />
    </div>
  );
}
