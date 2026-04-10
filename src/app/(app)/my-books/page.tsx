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

export default async function MyBooksPage() {
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
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 font-medium">No active season right now.</p>
        <p className="text-sm text-gray-400 mt-1">Check back when your organizer starts a new season!</p>
      </div>
    );

  const [entries, genres, config, leaderboard, { data: profile }] =
    await Promise.all([
      getUserBookEntries(season.id, user.id) as Promise<BookEntryWithBook[]>,
      getOrgGenres(currentOrg.id),
      getScoringConfig(currentOrg.id),
      getLeaderboardData(season.id, currentOrg.id),
      supabase
        .from("profiles")
        .select("about_text, goodreads_url, storygraph_url")
        .eq("id", user.id)
        .single(),
    ]);

  const playerLeaderboard = leaderboard.find((p) => p.user_id === user.id);

  let scoreBreakdown: ScoreBreakdownInfo | null = null;
  let rankContext: RankContext | undefined;

  if (playerLeaderboard) {
    const sorted = [...leaderboard].sort(
      (a, b) => b.total_points - a.total_points
    );
    const idx = sorted.findIndex((p) => p.user_id === user.id);
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
      currentUserId: user.id,
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
      playerName=""
      entries={entries}
      genres={genres}
      isCurrentUser={true}
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
