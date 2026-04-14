import { createClient } from "@/lib/supabase/server";
import { getLeaderboardData } from "@/lib/queries/leaderboard";
import {
  getActiveSeason,
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { LeaderboardPodium } from "@/components/leaderboard-podium";
import { LeaderboardTable } from "@/components/leaderboard-table";

export default async function LeaderboardPage() {
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
  if (!season)
    return <div className="p-8 text-center">No active season.</div>;

  const players = await getLeaderboardData(season.id, currentOrg.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {currentOrg.name} &middot; {season.name}
        </p>
      </div>
      <LeaderboardPodium players={players} />
      <LeaderboardTable players={players} currentUserId={user.id} />
    </div>
  );
}
