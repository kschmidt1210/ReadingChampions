import { createClient } from "@/lib/supabase/server";
import { calculateSeasonBonuses } from "@/lib/scoring";
import type { ScoringRulesConfig, LeaderboardPlayer } from "@/types/database";

export async function getLeaderboardData(
  seasonId: string,
  orgId: string
): Promise<LeaderboardPlayer[]> {
  const supabase = await createClient();

  // Get all entries for this season with book and profile data
  const { data: entries, error } = await supabase
    .from("book_entries")
    .select("*, book:books(title, pages), profile:profiles(display_name)")
    .eq("season_id", seasonId);

  if (error) throw error;
  if (!entries?.length) return [];

  // Get scoring config
  const { data: scoringRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .order("org_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const config = scoringRules?.config as ScoringRulesConfig;

  // Get org genres for genre challenge
  const { data: genres } = await supabase
    .from("genres")
    .select("id")
    .eq("org_id", orgId);

  const genreIds = (genres ?? []).map((g) => g.id);

  // Group entries by user
  const byUser = new Map<
    string,
    {
      display_name: string;
      entries: typeof entries;
    }
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

  // Calculate per-player totals with season bonuses
  const players: LeaderboardPlayer[] = [];

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

    // Season bonuses only count completed entries
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
    });
  }

  // Sort by total points descending, assign ranks
  players.sort((a, b) => b.total_points - a.total_points);
  players.forEach((p, i) => (p.rank = i + 1));

  return players;
}
