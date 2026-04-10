"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, BookOpen, Trophy, Star } from "lucide-react";
import type { LeaderboardPlayer } from "@/types/database";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/components/view-mode-provider";
import { ViewModeToggle } from "@/components/view-mode-toggle";

type SortKey = "points" | "books" | "pages" | "countries" | "series";
type SortDir = "asc" | "desc";

const rankColors: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 ring-amber-300/50",
  2: "bg-indigo-100 text-indigo-600 ring-indigo-300/50",
  3: "bg-orange-100 text-orange-700 ring-orange-300/50",
};

const challengeBadges: Record<number, { className: string; label: string }> = {
  1: { className: "bg-amber-100 text-amber-700", label: "1st" },
  2: { className: "bg-indigo-100 text-indigo-600", label: "2nd" },
};

function ProgressPip({
  filled,
  total,
  filledClass,
  emptyClass,
}: {
  filled: number;
  total: number;
  filledClass: string;
  emptyClass: string;
}) {
  const pct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  return (
    <div
      className={cn("h-1.5 rounded-full overflow-hidden w-full", emptyClass)}
    >
      <div
        className={cn("h-full rounded-full transition-all", filledClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ChallengeBadge({ rank }: { rank: number }) {
  const badge = challengeBadges[rank];
  if (!badge) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-bold leading-none",
        badge.className
      )}
    >
      {badge.label}
    </span>
  );
}

function SortIndicator({
  columnKey,
  activeKey,
  direction,
}: {
  columnKey: SortKey;
  activeKey: SortKey;
  direction: SortDir;
}) {
  if (columnKey !== activeKey) {
    return (
      <ArrowUpDown className="h-3 w-3 opacity-40 md:opacity-0 md:group-hover/sort:opacity-60 transition-opacity" />
    );
  }
  const Icon = direction === "desc" ? ArrowDown : ArrowUp;
  return <Icon className="h-3 w-3" />;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
        {label}
      </div>
      <div className="text-sm font-bold text-gray-800 tabular-nums">{value}</div>
      {sub && (
        <div className="text-xs text-gray-400 mt-0.5 truncate">{sub}</div>
      )}
    </div>
  );
}

function HighlightRow({
  icon,
  label,
  title,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  title: string | null;
  detail: string;
}) {
  if (!title) return null;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <div className="text-sm font-medium text-gray-700 truncate">{title}</div>
        <div className="text-xs text-gray-400">{detail}</div>
      </div>
    </div>
  );
}

function PlayerDetailPanel({ player }: { player: LeaderboardPlayer }) {
  const hasBonus = player.country_bonus > 0 || player.series_bonus > 0;
  const hasHighlights =
    player.longest_book_title ||
    player.highest_point_book_title ||
    player.highest_rated_book_title;

  return (
    <div className="px-5 pb-4 pt-1">
      <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4">
        {/* Performance stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {player.book_page_count !== player.page_count && (
            <StatCard
              label="Book Only Pages"
              value={player.book_page_count.toLocaleString()}
              sub={`of ${player.page_count.toLocaleString()} total`}
            />
          )}
          <StatCard
            label="Avg Book Length"
            value={`${Math.round(player.avg_book_length).toLocaleString()} pg`}
          />
          <StatCard
            label="Avg Pts / Book"
            value={player.avg_points_per_book.toFixed(2)}
          />
          {player.pre_bonus_total > 0 && (
            <StatCard
              label="Pre-Bonus Total"
              value={player.pre_bonus_total.toFixed(2)}
            />
          )}
          {player.completed_count !== player.book_count && (
            <StatCard
              label="Completed"
              value={`${player.completed_count} of ${player.book_count}`}
              sub={`${player.book_count - player.completed_count} did not finish`}
            />
          )}
        </div>

        {/* Bonuses */}
        {hasBonus && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {player.country_bonus > 0 && (
              <StatCard
                label="Country Bonus"
                value={`+${player.country_bonus.toFixed(1)} pts`}
                sub={`Rank #${player.country_rank} in countries`}
              />
            )}
            {player.series_bonus > 0 && (
              <StatCard
                label="Series Bonus"
                value={`+${player.series_bonus.toFixed(1)} pts`}
                sub={`Rank #${player.series_rank} in series`}
              />
            )}
          </div>
        )}

        {/* Highlights */}
        {hasHighlights && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <HighlightRow
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label="Longest Book"
              title={player.longest_book_title}
              detail={`${player.longest_book_pages.toLocaleString()} pages`}
            />
            <HighlightRow
              icon={<Trophy className="h-3.5 w-3.5" />}
              label="Top Scoring"
              title={player.highest_point_book_title}
              detail={`${player.highest_point_book_score.toFixed(2)} pts`}
            />
            <HighlightRow
              icon={<Star className="h-3.5 w-3.5" />}
              label="Highest Rated"
              title={player.highest_rated_book_title}
              detail={
                player.highest_rated_book_rating != null
                  ? `${player.highest_rated_book_rating} / 5`
                  : ""
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function LeaderboardTable({
  players,
  currentUserId,
}: {
  players: LeaderboardPlayer[];
  currentUserId: string;
}) {
  const { viewMode } = useViewMode();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() =>
    viewMode === "detail" ? new Set(players.map((p) => p.user_id)) : new Set()
  );

  useEffect(() => {
    if (viewMode === "detail") {
      setExpandedRows(new Set(players.map((p) => p.user_id)));
    } else {
      setExpandedRows(new Set());
    }
  }, [viewMode, players]);

  const toggleExpand = useCallback((userId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const displayPlayers = useMemo(() => {
    let result = players;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => p.display_name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "points":
          cmp = a.total_points - b.total_points;
          break;
        case "books":
          cmp = a.book_count - b.book_count;
          break;
        case "pages":
          cmp = a.page_count - b.page_count;
          break;
        case "countries":
          cmp = a.unique_countries - b.unique_countries;
          break;
        case "series":
          cmp = a.best_series_pages - b.best_series_pages;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [players, search, sortKey, sortDir]);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Search & View Toggle */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <label htmlFor="leaderboard-search" className="sr-only">Search players</label>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              id="leaderboard-search"
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 md:h-8 pl-8 pr-8 text-sm rounded-lg border border-gray-200 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:text-gray-700 p-1.5 rounded-md"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <ViewModeToggle />
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center px-5 py-3 bg-gray-50/80 border-y border-gray-200/80">
        <span className="w-12 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Rank
        </span>
        <span className="flex-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Player
        </span>
        <button
          onClick={() => toggleSort("books")}
          className={cn(
            "group/sort w-14 text-center text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 cursor-pointer transition-colors",
            sortKey === "books"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          Books
          <SortIndicator
            columnKey="books"
            activeKey={sortKey}
            direction={sortDir}
          />
        </button>
        <button
          onClick={() => toggleSort("pages")}
          className={cn(
            "group/sort w-16 text-center text-xs font-semibold uppercase tracking-wider items-center justify-center gap-0.5 cursor-pointer transition-colors hidden sm:flex",
            sortKey === "pages"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          Pages
          <SortIndicator
            columnKey="pages"
            activeKey={sortKey}
            direction={sortDir}
          />
        </button>
        <button
          onClick={() => toggleSort("countries")}
          className={cn(
            "group/sort w-20 text-center text-xs font-semibold uppercase tracking-wider items-center justify-center gap-0.5 cursor-pointer transition-colors hidden sm:flex",
            sortKey === "countries"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          Countries
          <SortIndicator
            columnKey="countries"
            activeKey={sortKey}
            direction={sortDir}
          />
        </button>
        <button
          onClick={() => toggleSort("series")}
          className={cn(
            "group/sort w-24 text-center text-xs font-semibold uppercase tracking-wider items-center justify-center gap-0.5 cursor-pointer transition-colors hidden sm:flex",
            sortKey === "series"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          Series
          <SortIndicator
            columnKey="series"
            activeKey={sortKey}
            direction={sortDir}
          />
        </button>
        <button
          onClick={() => toggleSort("points")}
          className={cn(
            "group/sort w-22 text-xs font-semibold uppercase tracking-wider flex items-center justify-end gap-0.5 cursor-pointer transition-colors",
            sortKey === "points"
              ? "text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          Points
          <SortIndicator
            columnKey="points"
            activeKey={sortKey}
            direction={sortDir}
          />
        </button>
        <span className="w-6 ml-1" />
      </div>

      {/* Rows */}
      {displayPlayers.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">
            No players match &ldquo;{search}&rdquo;
          </p>
          <button
            onClick={() => setSearch("")}
            className="text-xs text-indigo-600 hover:underline mt-1"
          >
            Clear search
          </button>
        </div>
      ) : (
        displayPlayers.map((player) => {
          const isCurrentUser = player.user_id === currentUserId;
          const rankStyle = rankColors[player.rank];
          const isExpanded = expandedRows.has(player.user_id);

          const alphabetComplete = player.unique_letters >= 26;
          const alphabetHalf = player.unique_letters >= 13;
          const genreComplete =
            player.total_genre_count > 0 &&
            player.covered_genre_count >= player.total_genre_count;

          return (
            <div key={player.user_id}>
              <button
                type="button"
                onClick={() => toggleExpand(player.user_id)}
                aria-expanded={isExpanded}
                className={cn(
                  "w-full flex items-center px-5 py-4 border-b border-gray-100/80 transition-colors hover:bg-gray-50/60 active:bg-gray-100/60 cursor-pointer text-left",
                  isCurrentUser &&
                    "bg-indigo-50/50 border-l-[3px] border-l-indigo-500 hover:bg-indigo-50/70",
                  isExpanded && !isCurrentUser && "bg-gray-50/40",
                  isExpanded && isCurrentUser && "bg-indigo-50/70"
                )}
              >
                <span className="w-12">
                  {rankStyle ? (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ring-1",
                        rankStyle
                      )}
                    >
                      {player.rank}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-semibold text-gray-400">
                      {player.rank}
                    </span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={
                      isCurrentUser ? "/my-books" : `/player/${player.user_id}`
                    }
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "font-semibold text-[0.95rem] hover:underline decoration-1 underline-offset-2 block truncate",
                      isCurrentUser ? "text-indigo-700" : "text-gray-900"
                    )}
                  >
                    {isCurrentUser
                      ? `You (${player.display_name})`
                      : player.display_name}
                  </Link>
                    <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wide shrink-0",
                          alphabetComplete
                            ? "text-indigo-600"
                            : alphabetHalf
                              ? "text-indigo-500"
                              : "text-gray-400"
                        )}
                      >
                        A-Z
                      </span>
                      <div className="w-12 sm:w-16">
                        <ProgressPip
                          filled={player.unique_letters}
                          total={26}
                          filledClass={
                            alphabetComplete
                              ? "bg-indigo-500"
                              : "bg-indigo-400/70"
                          }
                          emptyClass="bg-gray-100"
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums shrink-0",
                          alphabetComplete ? "text-indigo-600" : "text-gray-400"
                        )}
                      >
                        {player.unique_letters}/26
                      </span>
                    </div>
                    {player.total_genre_count > 0 && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide shrink-0",
                            genreComplete ? "text-emerald-600" : "text-gray-400"
                          )}
                        >
                          Genre
                        </span>
                        <div className="w-10 sm:w-14">
                          <ProgressPip
                            filled={player.covered_genre_count}
                            total={player.total_genre_count}
                            filledClass={
                              genreComplete
                                ? "bg-emerald-500"
                                : "bg-emerald-400/70"
                            }
                            emptyClass="bg-gray-100"
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium tabular-nums shrink-0",
                            genreComplete ? "text-emerald-600" : "text-gray-400"
                          )}
                        >
                          {player.covered_genre_count}/{player.total_genre_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "w-14 text-center text-sm font-medium",
                    isCurrentUser ? "text-indigo-600/80" : "text-gray-500"
                  )}
                >
                  {player.book_count}
                  {player.reading_count > 0 && (
                    <span className="text-amber-500 text-xs">
                      {" "}
                      +{player.reading_count}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "w-16 text-center text-sm font-medium hidden sm:block",
                    isCurrentUser ? "text-indigo-600/80" : "text-gray-500"
                  )}
                >
                  {player.page_count.toLocaleString()}
                </span>
                <div className="w-20 text-center hidden sm:block">
                  {player.unique_countries > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          player.country_rank <= 2
                            ? "text-gray-900"
                            : isCurrentUser
                              ? "text-indigo-600/80"
                              : "text-gray-500"
                        )}
                      >
                        {player.unique_countries}
                      </span>
                      <ChallengeBadge rank={player.country_rank} />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-300">&mdash;</span>
                  )}
                </div>
                <div className="w-24 text-center hidden sm:block">
                  {player.best_series_pages > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          player.series_rank <= 2
                            ? "text-gray-900"
                            : isCurrentUser
                              ? "text-indigo-600/80"
                              : "text-gray-500"
                        )}
                      >
                        {player.best_series_pages.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400 ml-0.5">
                          pg
                        </span>
                      </span>
                      <span className="text-xs text-gray-400 truncate max-w-[5.5rem]">
                        {player.best_series_name}
                        {player.best_series_count > 0 &&
                          ` (${player.best_series_count})`}
                      </span>
                      <ChallengeBadge rank={player.series_rank} />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-300">&mdash;</span>
                  )}
                </div>
                <span className="w-22 text-right">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-bold text-indigo-700">
                    {player.total_points.toFixed(2)}
                  </span>
                  {player.pending_points > 0 && (
                    <span className="block text-xs font-medium text-amber-500 mt-0.5">
                      +{player.pending_points.toFixed(1)} pending
                    </span>
                  )}
                </span>
                <span className="w-6 flex items-center justify-center ml-1">
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-gray-300 transition-transform duration-200",
                      isExpanded && "rotate-180 text-gray-500"
                    )}
                  />
                </span>
              </button>
              {isExpanded && (
                <div
                  className={cn(
                    "border-b border-gray-100/80",
                    isCurrentUser && "bg-indigo-50/30 border-l-[3px] border-l-indigo-500"
                  )}
                >
                  <PlayerDetailPanel player={player} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
