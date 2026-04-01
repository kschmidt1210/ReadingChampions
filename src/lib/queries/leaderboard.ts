import { createClient } from "@/lib/supabase/server";
import { calculateSeasonBonuses } from "@/lib/scoring";
import type {
  ScoringRulesConfig,
  LeaderboardPlayer,
  LeaderboardData,
  ChallengeRanking,
} from "@/types/database";

function getFirstLetter(title: string): string {
  return title
    .replace(/^(the|a|an)\s+/i, "")
    .trim()
    .charAt(0)
    .toUpperCase();
}

export async function getLeaderboardData(
  seasonId: string,
  orgId: string
): Promise<LeaderboardData> {
  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from("book_entries")
    .select(
      "*, book:books(title, pages, country), profile:profiles(display_name)"
    )
    .eq("season_id", seasonId);

  if (error) throw error;
  if (!entries?.length)
    return { players: [], countryRankings: [], seriesRankings: [] };

  const { data: scoringRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .order("org_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const config = scoringRules?.config as ScoringRulesConfig;

  const { data: genres } = await supabase
    .from("genres")
    .select("id")
    .eq("org_id", orgId);

  const genreIds = (genres ?? []).map((g) => g.id);

  // Group entries by user
  const byUser = new Map<
    string,
    { display_name: string; entries: typeof entries }
  >();

  for (const entry of entries) {
    const userId = entry.user_id;
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        display_name: (entry as any).profile?.display_name ?? "Unknown",
        entries: [],
      });
    }
    byUser.get(userId)!.entries.push(entry);
  }

  const players: LeaderboardPlayer[] = [];

  // Track per-player country/series data for competitive rankings
  const countryData: Array<{
    user_id: string;
    display_name: string;
    count: number;
  }> = [];
  const seriesData: Array<{
    user_id: string;
    display_name: string;
    count: number;
    name: string;
    pages: number;
  }> = [];

  for (const [userId, data] of byUser) {
    const allPoints = data.entries.reduce(
      (sum, e) => sum + Number(e.points),
      0
    );

    const completedEntries = data.entries.filter((e) => e.completed);
    const pageCount = completedEntries.reduce(
      (sum, e) => sum + ((e as any).book?.pages ?? 0),
      0
    );

    // Alphabet progress
    const letters = new Set(
      completedEntries.map((e) => getFirstLetter((e as any).book?.title ?? ""))
    );

    // Genre progress
    const coveredGenres = new Set(
      completedEntries
        .map((e) => e.genre_id)
        .filter((g): g is string => g !== null)
    );
    const coveredGenreCount = genreIds.filter((gid) =>
      coveredGenres.has(gid)
    ).length;

    // Unique countries
    const countries = new Set(
      completedEntries
        .map((e) => (e as any).book?.country)
        .filter(
          (c): c is string => c !== null && c !== undefined && c !== ""
        )
    );
    countryData.push({
      user_id: userId,
      display_name: data.display_name,
      count: countries.size,
    });

    // Longest series: group completed entries by series_name
    const seriesCounts = new Map<string, { count: number; pages: number }>();
    for (const e of completedEntries) {
      const sn = e.series_name;
      if (!sn) continue;
      const prev = seriesCounts.get(sn) ?? { count: 0, pages: 0 };
      seriesCounts.set(sn, {
        count: prev.count + 1,
        pages: prev.pages + ((e as any).book?.pages ?? 0),
      });
    }
    let bestSeries = { name: "", count: 0, pages: 0 };
    for (const [name, stats] of seriesCounts) {
      if (
        stats.count > bestSeries.count ||
        (stats.count === bestSeries.count && stats.pages > bestSeries.pages)
      ) {
        bestSeries = { name, ...stats };
      }
    }
    if (bestSeries.count > 0) {
      seriesData.push({
        user_id: userId,
        display_name: data.display_name,
        count: bestSeries.count,
        name: bestSeries.name,
        pages: bestSeries.pages,
      });
    }

    // Season bonuses
    let seasonBonus = 0;
    if (config) {
      const enriched = completedEntries.map((e) => {
        const pages = (e as any).book?.pages ?? 0;
        const roundedPages = Math.round(pages / 50) * 50;
        const fiction = e.fiction;
        const base = fiction
          ? config.base_points.fiction
          : config.base_points.nonfiction;
        const pagePoints =
          Math.min(roundedPages, 100) * config.page_points.first_100_rate +
          Math.max(roundedPages - 100, 0) * config.page_points.beyond_100_rate;
        return {
          preBonusTotal: base + pagePoints,
          genre_id: e.genre_id,
          book: { title: (e as any).book?.title ?? "" },
        };
      });
      const bonuses = calculateSeasonBonuses(enriched, genreIds, config);
      seasonBonus = bonuses.totalSeasonBonus;
    }

    players.push({
      user_id: userId,
      display_name: data.display_name,
      total_points: allPoints + seasonBonus,
      book_count: completedEntries.length,
      reading_count: data.entries.length - completedEntries.length,
      page_count: pageCount,
      rank: 0,
      unique_letters: letters.size,
      covered_genre_count: coveredGenreCount,
      total_genre_count: genreIds.length,
    });
  }

  // Sort by total points descending, assign ranks
  players.sort((a, b) => b.total_points - a.total_points);
  players.forEach((p, i) => (p.rank = i + 1));

  // Build competitive rankings
  const pointTiers = config?.longest_road;

  const countryRankings = buildRankings(
    countryData
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((d) => ({
        user_id: d.user_id,
        display_name: d.display_name,
        value: d.count,
        detail: null,
      })),
    pointTiers?.countries ?? []
  );

  const seriesRankings = buildRankings(
    seriesData
      .sort(
        (a, b) => b.count - a.count || b.pages - a.pages
      )
      .map((d) => ({
        user_id: d.user_id,
        display_name: d.display_name,
        value: d.count,
        detail: d.name,
      })),
    pointTiers?.series ?? []
  );

  return { players, countryRankings, seriesRankings };
}

function buildRankings(
  sorted: Array<{
    user_id: string;
    display_name: string;
    value: number;
    detail: string | null;
  }>,
  pointTiers: number[]
): ChallengeRanking[] {
  let currentRank = 0;
  let lastValue = -1;

  return sorted.map((item, i) => {
    if (item.value !== lastValue) {
      currentRank = i + 1;
      lastValue = item.value;
    }
    return {
      ...item,
      rank: currentRank,
      points_awarded: currentRank <= pointTiers.length ? pointTiers[currentRank - 1] : 0,
    };
  });
}
