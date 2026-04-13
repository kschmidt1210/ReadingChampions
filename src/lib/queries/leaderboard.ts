import { createClient } from "@/lib/supabase/server";
import { calculateSeasonBonuses } from "@/lib/scoring";
import { isBookEntry } from "@/lib/scoring-types";
import type { ScoringRulesConfig, LeaderboardPlayer } from "@/types/database";

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
): Promise<LeaderboardPlayer[]> {
  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from("book_entries")
    .select(
      "*, book:books(title, pages, country), profile:profiles(display_name)"
    )
    .eq("season_id", seasonId);

  if (error) throw error;
  if (!entries?.length) return [];

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

  for (const [userId, data] of byUser) {
    const finishedEntries = data.entries.filter(
      (e) => e.status === "completed" || e.status === "did_not_finish"
    );
    const readingEntries = data.entries.filter((e) => e.status === "reading");

    // Entries that count toward challenges and season bonuses.
    // Currently only fully completed books qualify; DNF books earn points
    // but don't contribute to challenge progress. This could become an
    // org-level setting in the future (e.g. config.challenges.include_dnf).
    const challengeEntries = finishedEntries.filter(
      (e) => e.status === "completed"
    );

    const confirmedPoints = finishedEntries.reduce(
      (sum, e) => sum + Number(e.points),
      0
    );
    const pendingPoints = readingEntries.reduce(
      (sum, e) => sum + Number(e.points),
      0
    );

    const pageCount = finishedEntries.reduce(
      (sum, e) => {
        if (e.status === "did_not_finish") return sum + (e.pages_read ?? 0);
        return sum + ((e as any).book?.pages ?? 0);
      },
      0
    );

    const bookPageCount = finishedEntries
      .filter((e) => isBookEntry(e.deduction))
      .reduce(
        (sum, e) => {
          if (e.status === "did_not_finish") return sum + (e.pages_read ?? 0);
          return sum + ((e as any).book?.pages ?? 0);
        },
        0
      );

    // Alphabet progress (completed entries only)
    const letters = new Set(
      challengeEntries.map((e) =>
        getFirstLetter((e as any).book?.title ?? "")
      )
    );

    // Genre progress (completed entries only)
    const coveredGenres = new Set(
      challengeEntries
        .map((e) => e.genre_id)
        .filter((g): g is string => g !== null)
    );
    const coveredGenreCount = genreIds.filter((gid) =>
      coveredGenres.has(gid)
    ).length;

    // Unique countries (completed entries only)
    const countries = new Set(
      challengeEntries
        .map((e) => (e as any).book?.country)
        .filter(
          (c): c is string => c !== null && c !== undefined && c !== ""
        )
    );

    // Best series by total pages (completed entries only, case-insensitive grouping)
    const seriesCounts = new Map<string, { count: number; pages: number; canonicalName: string }>();
    for (const e of challengeEntries) {
      const sn = e.series_name?.trim();
      if (!sn) continue;
      const key = sn.toLowerCase();
      const prev = seriesCounts.get(key) ?? { count: 0, pages: 0, canonicalName: sn };
      seriesCounts.set(key, {
        count: prev.count + 1,
        pages: prev.pages + ((e as any).book?.pages ?? 0),
        canonicalName: prev.count > 0 ? prev.canonicalName : sn,
      });
    }
    let bestSeries = { name: "", count: 0, pages: 0 };
    for (const [, stats] of seriesCounts) {
      if (
        stats.pages > bestSeries.pages ||
        (stats.pages === bestSeries.pages && stats.count > bestSeries.count)
      ) {
        bestSeries = { name: stats.canonicalName, count: stats.count, pages: stats.pages };
      }
    }

    // Season bonuses (completed entries only, consistent with challengeEntries).
    // preBonusTotal per entry = stored per-book score (after per-book bonuses/
    // deductions, but before season-level bonuses). This matches the source
    // spreadsheet's "Pre-Bonus Points" definition.
    let seasonBonus = 0;
    if (config) {
      const enriched = challengeEntries.map((e) => ({
        preBonusTotal: Number(e.points),
        genre_id: e.genre_id,
        book: { title: (e as any).book?.title ?? "" },
      }));
      const bonuses = calculateSeasonBonuses(enriched, genreIds, config);
      seasonBonus = bonuses.totalSeasonBonus;
    }

    // Longest book by page count
    let longestBookTitle: string | null = null;
    let longestBookPages = 0;
    for (const e of finishedEntries) {
      const pages = (e as any).book?.pages ?? 0;
      if (pages > longestBookPages) {
        longestBookPages = pages;
        longestBookTitle = (e as any).book?.title ?? null;
      }
    }

    // Highest-scoring single book entry
    let highestPointTitle: string | null = null;
    let highestPointScore = 0;
    for (const e of finishedEntries) {
      const pts = Number(e.points);
      if (pts > highestPointScore) {
        highestPointScore = pts;
        highestPointTitle = (e as any).book?.title ?? null;
      }
    }

    // Highest-rated book (by user rating)
    let highestRatedTitle: string | null = null;
    let highestRatedRating: number | null = null;
    for (const e of finishedEntries) {
      if (e.rating != null && (highestRatedRating == null || e.rating > highestRatedRating)) {
        highestRatedRating = e.rating;
        highestRatedTitle = (e as any).book?.title ?? null;
      }
    }

    const bookCount = finishedEntries.length;

    players.push({
      user_id: userId,
      display_name: data.display_name,
      total_points: confirmedPoints + seasonBonus,
      pending_points: pendingPoints,
      book_count: bookCount,
      completed_count: challengeEntries.length,
      reading_count: readingEntries.length,
      page_count: pageCount,
      book_page_count: bookPageCount,
      rank: 0,
      unique_letters: letters.size,
      covered_genre_count: coveredGenreCount,
      total_genre_count: genreIds.length,
      unique_countries: countries.size,
      best_series_pages: bestSeries.pages,
      best_series_name: bestSeries.name || null,
      best_series_count: bestSeries.count,
      country_rank: 0,
      series_rank: 0,
      pre_bonus_total: confirmedPoints,
      country_bonus: 0,
      series_bonus: 0,
      longest_book_title: longestBookTitle,
      longest_book_pages: longestBookPages,
      avg_book_length: bookCount > 0 ? pageCount / bookCount : 0,
      avg_points_per_book: bookCount > 0 ? (confirmedPoints + seasonBonus) / bookCount : 0,
      highest_point_book_title: highestPointTitle,
      highest_point_book_score: highestPointScore,
      highest_rated_book_title: highestRatedTitle,
      highest_rated_book_rating: highestRatedRating,
    });
  }

  // Sort by total points descending, assign overall ranks
  players.sort((a, b) => b.total_points - a.total_points);
  players.forEach((p, i) => (p.rank = i + 1));

  // Assign country ranks (by unique_countries desc, ties get same rank)
  const byCountries = [...players]
    .filter((p) => p.unique_countries > 0)
    .sort((a, b) => b.unique_countries - a.unique_countries);
  assignChallengeRanks(byCountries, (p) => p.unique_countries, (p, r) => { p.country_rank = r; });

  // Assign series ranks (by best_series_pages desc, tie-break by count)
  const bySeries = [...players]
    .filter((p) => p.best_series_pages > 0)
    .sort((a, b) => b.best_series_pages - a.best_series_pages || b.best_series_count - a.best_series_count);
  assignChallengeRanks(bySeries, (p) => p.best_series_pages, (p, r) => { p.series_rank = r; });

  // Assign longest-road bonus points based on rank (top 3 get tiered bonus)
  if (config) {
    for (const p of players) {
      if (p.country_rank >= 1 && p.country_rank <= 3) {
        p.country_bonus = config.longest_road.countries[p.country_rank - 1] ?? 0;
      }
      if (p.series_rank >= 1 && p.series_rank <= 3) {
        p.series_bonus = config.longest_road.series[p.series_rank - 1] ?? 0;
      }
      p.total_points += p.country_bonus + p.series_bonus;
      if (p.book_count > 0) {
        p.avg_points_per_book = p.total_points / p.book_count;
      }
    }
    // Re-sort and re-rank after adding longest-road bonuses
    players.sort((a, b) => b.total_points - a.total_points);
    players.forEach((p, i) => (p.rank = i + 1));
  }

  return players;
}

function assignChallengeRanks<T>(
  sorted: T[],
  getValue: (item: T) => number,
  setRank: (item: T, rank: number) => void,
) {
  let currentRank = 0;
  let lastValue = -1;
  for (let i = 0; i < sorted.length; i++) {
    const val = getValue(sorted[i]);
    if (val !== lastValue) {
      currentRank = i + 1;
      lastValue = val;
    }
    setRank(sorted[i], currentRank);
  }
}
