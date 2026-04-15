"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, BookOpen, Trophy, Star, User, SlidersHorizontal } from "lucide-react";
import type { LeaderboardPlayer } from "@/types/database";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/components/view-mode-provider";
import { ViewModeToggle } from "@/components/view-mode-toggle";

type SortKey = "points" | "books" | "pages" | "book_pages" | "countries" | "series";
type SortDir = "asc" | "desc";

const sortLabels: Record<SortKey, string> = {
  points: "Points",
  books: "Books",
  pages: "Pages",
  book_pages: "Book-Only Pages",
  countries: "Countries",
  series: "Series",
};

const columnSortKeys = new Set<SortKey>(["points", "books", "pages", "countries", "series"]);

const rankColors: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 ring-amber-300/50 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-700/50",
  2: "bg-indigo-100 text-indigo-600 ring-indigo-300/50 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-700/50",
  3: "bg-orange-100 text-orange-700 ring-orange-300/50 dark:bg-orange-900/50 dark:text-orange-300 dark:ring-orange-700/50",
};

const challengeBadges: Record<number, { className: string; label: string }> = {
  1: { className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", label: "1st" },
  2: { className: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300", label: "2nd" },
  3: { className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", label: "3rd" },
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
    <div className="rounded-lg bg-card ring-1 ring-border/60 px-3 py-2.5 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="text-sm font-bold text-foreground tabular-nums">{value}</div>
      {sub && (
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>
      )}
    </div>
  );
}

function HighlightRow({
  icon,
  label,
  title,
  detail,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  title: string | null;
  detail: string;
  iconClass?: string;
}) {
  if (!title) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-card ring-1 ring-border/60 px-3 py-2.5 min-w-0">
      <span className={cn("mt-0.5 shrink-0", iconClass ?? "text-muted-foreground")}>{icon}</span>
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function PlayerDetailPanel({ player, isCurrentUser }: { player: LeaderboardPlayer; isCurrentUser?: boolean }) {
  const hasHighlights =
    player.longest_book_title ||
    player.highest_point_book_title ||
    player.highest_rated_book_title;

  return (
    <div className="px-5 pb-4 pt-1">
      <div className={cn(
        "rounded-xl border p-4",
        isCurrentUser
          ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-950/40"
          : "border-border bg-muted"
      )}>
        {/* Performance stats & bonuses */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <StatCard
            label="Book Only Pages"
            value={player.book_page_count.toLocaleString()}
            sub={
              player.book_page_count !== player.page_count
                ? `of ${player.page_count.toLocaleString()} total`
                : undefined
            }
          />
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
          {player.country_bonus > 0 && (
            <StatCard
              label="Country Bonus"
              value={`+${player.country_bonus.toFixed(2)} pts`}
              sub={`Rank #${player.country_rank} in countries`}
            />
          )}
          {player.series_bonus > 0 && (
            <StatCard
              label="Series Bonus"
              value={`+${player.series_bonus.toFixed(2)} pts`}
              sub={`Rank #${player.series_rank} in series`}
            />
          )}
        </div>

        {/* Highlights */}
        {hasHighlights && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <HighlightRow
              icon={<BookOpen className="h-3.5 w-3.5" />}
              iconClass="text-indigo-500 dark:text-indigo-400"
              label="Longest Book"
              title={player.longest_book_title}
              detail={`${player.longest_book_pages.toLocaleString()} pages`}
            />
            <HighlightRow
              icon={<Trophy className="h-3.5 w-3.5" />}
              iconClass="text-amber-500 dark:text-amber-400"
              label="Top Scoring"
              title={player.highest_point_book_title}
              detail={`${player.highest_point_book_score.toFixed(2)} pts`}
            />
            <HighlightRow
              icon={<Star className="h-3.5 w-3.5" />}
              iconClass="text-emerald-500 dark:text-emerald-400"
              label="Highest Rated"
              title={player.highest_rated_book_title}
              detail={
                player.highest_rated_book_rating != null
                  ? `${player.highest_rated_book_rating} / 10`
                  : ""
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Experimental: floating "Find me" button. To revert, delete this component and its render line. */
function FindMeButton({
  targetRef,
  visible,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}) {
  const [isTargetVisible, setIsTargetVisible] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsTargetVisible(entry.isIntersecting),
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef, visible]);

  if (!visible || isTargetVisible) return null;

  return (
    <div className="sticky bottom-4 flex justify-end px-4 pb-1 pointer-events-none">
      <button
        type="button"
        onClick={() =>
          targetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
      >
        <User className="h-3.5 w-3.5" />
        Find me
      </button>
    </div>
  );
}

const simpleSortKeys = new Set<SortKey>(["points", "books"]);

export function LeaderboardTable({
  players,
  currentUserId,
}: {
  players: LeaderboardPlayer[];
  currentUserId: string;
}) {
  const { viewMode } = useViewMode();
  const isSimple = viewMode === "simple";
  const currentUserRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (isSimple && !simpleSortKeys.has(sortKey)) {
      setSortKey("points");
    }
  }, [isSimple, sortKey]);

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
        case "book_pages":
          cmp = a.book_page_count - b.book_page_count;
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
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
      {/* Search, Sort & View Toggle */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 basis-48">
            <label htmlFor="leaderboard-search" className="sr-only">Search players</label>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              id="leaderboard-search"
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 md:h-8 pl-8 pr-8 text-sm rounded-lg border border-border bg-muted/50 placeholder:text-muted-foreground focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground active:text-foreground p-1.5 rounded-md"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="leaderboard-sort" className="sr-only">Sort by</label>
            <div className="relative">
              <SlidersHorizontal className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <select
                id="leaderboard-sort"
                value={sortKey}
                onChange={(e) => {
                  const key = e.target.value as SortKey;
                  setSortKey(key);
                  setSortDir("desc");
                }}
                className={cn(
                  "text-xs h-11 md:h-8 pl-7 pr-6 rounded-lg border bg-muted/50 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-colors",
                  !columnSortKeys.has(sortKey)
                    ? "border-indigo-300 text-indigo-700"
                    : "border-border text-foreground"
                )}
              >
                {(Object.keys(sortLabels) as SortKey[]).filter(
                  (key) => !isSimple || simpleSortKeys.has(key)
                ).map((key) => (
                  <option key={key} value={key}>
                    {sortLabels[key]}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="h-11 w-11 md:h-8 md:w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted active:bg-muted text-muted-foreground transition-colors shrink-0"
              aria-label={sortDir === "desc" ? "Sort descending" : "Sort ascending"}
            >
              {sortDir === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
            </button>
            <ViewModeToggle />
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center px-5 py-3 bg-muted/80 border-y border-border/80">
        <span className="w-12 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Rank
        </span>
        <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Player
        </span>
        <button
          onClick={() => toggleSort("books")}
          className={cn(
            "group/sort w-14 text-center text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 cursor-pointer transition-colors",
            sortKey === "books"
              ? "text-indigo-600"
              : "text-muted-foreground hover:text-muted-foreground"
          )}
        >
          Books
          <SortIndicator
            columnKey="books"
            activeKey={sortKey}
            direction={sortDir}
          />
        </button>
        {!isSimple && (
          <>
            <button
              onClick={() => toggleSort("pages")}
              className={cn(
                "group/sort w-16 text-center text-xs font-semibold uppercase tracking-wider items-center justify-center gap-0.5 cursor-pointer transition-colors hidden sm:flex",
                sortKey === "pages"
                  ? "text-indigo-600"
                  : "text-muted-foreground hover:text-muted-foreground"
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
                  : "text-muted-foreground hover:text-muted-foreground"
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
                  : "text-muted-foreground hover:text-muted-foreground"
              )}
            >
              Series
              <SortIndicator
                columnKey="series"
                activeKey={sortKey}
                direction={sortDir}
              />
            </button>
          </>
        )}
        <button
          onClick={() => toggleSort("points")}
          className={cn(
            "group/sort w-22 text-xs font-semibold uppercase tracking-wider flex items-center justify-end gap-0.5 cursor-pointer transition-colors",
            sortKey === "points"
              ? "text-indigo-600"
              : "text-muted-foreground hover:text-muted-foreground"
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
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">
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
            <div
              key={player.user_id}
              ref={isCurrentUser ? currentUserRef : undefined}
              className={cn(
                isExpanded && "mb-3 rounded-xl overflow-hidden shadow-sm ring-1 ring-border/60",
                isCurrentUser && "border-l-4 border-l-indigo-500",
                isCurrentUser && isExpanded && "ring-indigo-300/50 dark:ring-indigo-700/50",
              )}
            >
              <button
                type="button"
                onClick={() => toggleExpand(player.user_id)}
                aria-expanded={isExpanded}
                className={cn(
                  "w-full flex items-center px-5 py-4 border-b border-border/80 transition-colors hover:bg-muted/60 active:bg-muted/60 cursor-pointer text-left",
                  isCurrentUser &&
                    "bg-indigo-50/80 hover:bg-indigo-50/90 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/50",
                  isExpanded && !isCurrentUser && "bg-muted/40",
                  isExpanded && isCurrentUser && "bg-indigo-50 dark:bg-indigo-950/50",
                  isExpanded && "sticky top-0 z-10",
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
                    <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-semibold text-muted-foreground">
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
                      isCurrentUser ? "text-indigo-700 dark:text-indigo-300" : "text-foreground"
                    )}
                  >
                    {isCurrentUser
                      ? `You (${player.display_name})`
                      : player.display_name}
                  </Link>
                  {!isSimple && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide shrink-0",
                            alphabetComplete
                              ? "text-indigo-600"
                              : alphabetHalf
                                ? "text-indigo-500"
                                : "text-muted-foreground"
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
                            emptyClass="bg-muted"
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium tabular-nums shrink-0",
                            alphabetComplete ? "text-indigo-600" : "text-muted-foreground"
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
                              genreComplete ? "text-emerald-600" : "text-muted-foreground"
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
                              emptyClass="bg-muted"
                            />
                          </div>
                          <span
                            className={cn(
                              "text-xs font-medium tabular-nums shrink-0",
                              genreComplete ? "text-emerald-600" : "text-muted-foreground"
                            )}
                          >
                            {player.covered_genre_count}/{player.total_genre_count}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "w-14 text-center text-sm font-medium",
                    isCurrentUser ? "text-indigo-600/80 dark:text-indigo-400" : "text-muted-foreground"
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
                {!isSimple && (
                  <>
                    <span
                      className={cn(
                        "w-16 text-center text-sm font-medium hidden sm:block",
                        isCurrentUser ? "text-indigo-600/80 dark:text-indigo-400" : "text-muted-foreground"
                      )}
                    >
                      {player.page_count.toLocaleString()}
                      {player.pending_page_count > 0 && (
                        <span className="text-amber-500 text-xs block">
                          +{player.pending_page_count.toLocaleString()}
                        </span>
                      )}
                    </span>
                    <div className="w-20 text-center hidden sm:block">
                      {player.unique_countries > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums",
                              player.country_rank <= 3
                                ? "text-foreground"
                                : isCurrentUser
                                  ? "text-indigo-600/80 dark:text-indigo-400"
                                  : "text-muted-foreground"
                            )}
                          >
                            {player.unique_countries}
                          </span>
                          <ChallengeBadge rank={player.country_rank} />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">&mdash;</span>
                      )}
                    </div>
                    <div className="w-24 text-center hidden sm:block">
                      {player.best_series_pages > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums",
                              player.series_rank <= 3
                                ? "text-foreground"
                                : isCurrentUser
                                  ? "text-indigo-600/80 dark:text-indigo-400"
                                  : "text-muted-foreground"
                            )}
                          >
                            {player.best_series_pages.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-0.5">
                              pg
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[5.5rem]">
                            {player.best_series_name}
                            {player.best_series_count > 0 &&
                              ` (${player.best_series_count})`}
                          </span>
                          <ChallengeBadge rank={player.series_rank} />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">&mdash;</span>
                      )}
                    </div>
                  </>
                )}
                <span className="w-22 text-right">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {player.total_points.toFixed(2)}
                  </span>
                  {player.pending_points > 0 && (
                    <span className="block text-xs font-medium text-amber-500 mt-0.5">
                      +{player.pending_points.toFixed(2)} pending
                    </span>
                  )}
                </span>
                <span className="w-6 flex items-center justify-center ml-1">
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180 text-muted-foreground"
                    )}
                  />
                </span>
              </button>
              {isExpanded && (
                <div
                  className={cn(
                    "border-b border-border/80",
                    isCurrentUser && "bg-indigo-50/50 dark:bg-indigo-950/30"
                  )}
                >
                  <PlayerDetailPanel player={player} isCurrentUser={isCurrentUser} />
                </div>
              )}
            </div>
          );
        })
      )}
      <FindMeButton
        targetRef={currentUserRef}
        visible={viewMode === "detail" && displayPlayers.length >= 4}
      />
    </div>
  );
}
