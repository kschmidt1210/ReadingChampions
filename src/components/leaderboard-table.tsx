"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import type { LeaderboardPlayer } from "@/types/database";
import { cn } from "@/lib/utils";

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
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold leading-none",
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
      <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/sort:opacity-60 transition-opacity" />
    );
  }
  const Icon = direction === "desc" ? ArrowDown : ArrowUp;
  return <Icon className="h-3 w-3" />;
}

export function LeaderboardTable({
  players,
  currentUserId,
}: {
  players: LeaderboardPlayer[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-8 text-sm rounded-lg border border-gray-200 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
            "group/sort w-20 text-center text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 cursor-pointer transition-colors",
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
            "group/sort w-24 text-center text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 cursor-pointer transition-colors",
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
      </div>

      {/* Rows */}
      {displayPlayers.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No players match your search.
        </div>
      ) : (
        displayPlayers.map((player) => {
          const isCurrentUser = player.user_id === currentUserId;
          const rankStyle = rankColors[player.rank];

          const alphabetComplete = player.unique_letters >= 26;
          const alphabetHalf = player.unique_letters >= 13;
          const genreComplete =
            player.total_genre_count > 0 &&
            player.covered_genre_count >= player.total_genre_count;

          return (
            <div
              key={player.user_id}
              className={cn(
                "flex items-center px-5 py-4 border-b border-gray-100/80 last:border-b-0 transition-colors hover:bg-gray-50/60",
                isCurrentUser &&
                  "bg-indigo-50/50 border-l-[3px] border-l-indigo-500 hover:bg-indigo-50/70"
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
                        "text-[0.65rem] font-semibold uppercase tracking-wide shrink-0",
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
                        "text-[0.65rem] font-medium tabular-nums shrink-0",
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
                          "text-[0.65rem] font-semibold uppercase tracking-wide shrink-0",
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
                          "text-[0.65rem] font-medium tabular-nums shrink-0",
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
              <div className="w-20 text-center">
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
              <div className="w-24 text-center">
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
                      <span className="text-[0.65rem] font-normal text-gray-400 ml-0.5">
                        pg
                      </span>
                    </span>
                    <span className="text-[0.6rem] text-gray-400 truncate max-w-[5.5rem]">
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
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
