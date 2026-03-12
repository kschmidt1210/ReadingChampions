import { createClient } from "@/lib/supabase/server";
import { getLeaderboardData } from "@/lib/queries/leaderboard";
import {
  getActiveSeason,
  getUserOrganizations,
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
  const currentOrg = orgs[0]; // Will use org context in future
  if (!currentOrg)
    return (
      <div className="p-8 text-center">Join a competition to get started!</div>
    );

  const season = await getActiveSeason(currentOrg.id);
  if (!season)
    return <div className="p-8 text-center">No active season.</div>;

  const players = await getLeaderboardData(season.id, currentOrg.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-6">
        Leaderboard &mdash; {currentOrg.name} {season.name}
      </h1>
      <LeaderboardPodium players={players} />
      <LeaderboardTable players={players} currentUserId={user.id} />
    </div>
  );
}
