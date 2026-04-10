import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserBookEntries } from "@/lib/queries/books";
import {
  getActiveSeason,
  getUserOrganizations,
  getCurrentOrg,
  getOrgGenres,
  getScoringConfig,
} from "@/lib/queries/organizations";
import { getLeaderboardData } from "@/lib/queries/leaderboard";
import { calculateSeasonBonuses } from "@/lib/scoring";
import { PlayerBooksView } from "@/components/player-books-view";
import type { BookEntryWithBook } from "@/types/database";
import type { ScoreBreakdownInfo, RankContext } from "@/components/player-books-view";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return notFound();

  const { data: membership } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", currentOrg.id)
    .eq("user_id", userId)
    .single();

  if (!membership) return notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, about_text, goodreads_url, storygraph_url")
    .eq("id", userId)
    .single();

  const playerName = profile?.display_name ?? "Unknown Player";

  const season = await getActiveSeason(currentOrg.id);
  if (!season)
    return <div className="p-8 text-center">No active season.</div>;

  const [entries, genres, config, leaderboard] = await Promise.all([
    getUserBookEntries(season.id, userId) as Promise<BookEntryWithBook[]>,
    getOrgGenres(currentOrg.id),
    getScoringConfig(currentOrg.id),
    getLeaderboardData(season.id, currentOrg.id),
  ]);

  const playerLeaderboard = leaderboard.find((p) => p.user_id === userId);

  let scoreBreakdown: ScoreBreakdownInfo | null = null;
  let rankContext: RankContext | undefined;

  if (playerLeaderboard) {
    const sorted = [...leaderboard].sort(
      (a, b) => b.total_points - a.total_points
    );
    const idx = sorted.findIndex((p) => p.user_id === userId);
    const rank = idx + 1;
    const playerAbove = idx > 0 ? sorted[idx - 1] : null;
    const playerBelow = idx < sorted.length - 1 ? sorted[idx + 1] : null;

    const neighborStart = Math.max(0, idx - 2);
    const neighborEnd = Math.min(sorted.length, idx + 3);
    const neighbors = sorted.slice(neighborStart, neighborEnd).map((p, i) => ({
      rank: neighborStart + i + 1,
      displayName: p.display_name,
      totalPoints: p.total_points,
      userId: p.user_id,
    }));

    rankContext = {
      rank,
      totalPlayers: sorted.length,
      pointsToNextRank: playerAbove
        ? playerAbove.total_points - playerLeaderboard.total_points
        : null,
      nextRankName: playerAbove?.display_name ?? null,
      nextRankRank: playerAbove ? idx : null,
      pointsAheadOfBehind: playerBelow
        ? playerLeaderboard.total_points - playerBelow.total_points
        : null,
      behindRankName: playerBelow?.display_name ?? null,
      behindRankRank: playerBelow ? idx + 2 : null,
      neighbors,
      currentUserId: userId,
    };
  }

  if (config && playerLeaderboard) {
    const completedEntries = entries.filter((e) => e.status === "completed");
    const enriched = completedEntries.map((e) => {
      const pages = e.book?.pages ?? 0;
      const roundedPages = Math.round(pages / 50) * 50;
      const base = e.fiction
        ? config.base_points.fiction
        : config.base_points.nonfiction;
      const pagePoints =
        Math.min(roundedPages, 100) * config.page_points.first_100_rate +
        Math.max(roundedPages - 100, 0) * config.page_points.beyond_100_rate;
      return {
        preBonusTotal: base + pagePoints,
        genre_id: e.genre_id,
        book: { title: e.book.title },
      };
    });
    const seasonBonuses = calculateSeasonBonuses(
      enriched,
      genres.map((g) => g.id),
      config
    );

    scoreBreakdown = {
      seasonBonuses: {
        genreComplete: seasonBonuses.genreCompleteBonus,
        alphabet: seasonBonuses.alphabetBonus,
        uniqueLetters: seasonBonuses.uniqueLetters,
      },
      longestRoad: {
        countryBonus: playerLeaderboard.country_bonus,
        countryRank: playerLeaderboard.country_rank,
        seriesBonus: playerLeaderboard.series_bonus,
        seriesRank: playerLeaderboard.series_rank,
        bestSeriesName: playerLeaderboard.best_series_name,
      },
      grandTotal: playerLeaderboard.total_points,
    };
  }

  return (
    <PlayerBooksView
      playerName={playerName}
      entries={entries}
      genres={genres}
      isCurrentUser={user.id === userId}
      isAdmin={currentOrg.role === "admin"}
      seasonId={season.id}
      profile={{
        about_text: profile?.about_text ?? null,
        goodreads_url: profile?.goodreads_url ?? null,
        storygraph_url: profile?.storygraph_url ?? null,
      }}
      scoreBreakdown={scoreBreakdown ?? undefined}
      rankContext={rankContext}
    />
  );
}
