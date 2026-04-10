"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  BookA,
  BookOpen,
  FileText,
  Star,
  Heart,
  Globe,
  Library,
  BookMarked,
  Search,
  ArrowDown,
  ArrowUp,
  X,
  ExternalLink,
  Settings,
  Trophy,
  Route,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { BookEntryCard } from "@/components/book-entry-card";
import { BookEntryPanel } from "@/components/book-entry-panel";
import { GenreGrid } from "@/components/genre-grid";
import { AlphabetGrid } from "@/components/alphabet-grid";
import type { BookEntryWithBook } from "@/types/database";
import { cn } from "@/lib/utils";

export interface ScoreBreakdownInfo {
  seasonBonuses: {
    genreComplete: number;
    alphabet: number;
    uniqueLetters: number;
  };
  longestRoad: {
    countryBonus: number;
    countryRank: number;
    seriesBonus: number;
    seriesRank: number;
    bestSeriesName: string | null;
  };
  grandTotal: number;
}

function getFirstLetter(title: string): string {
  return title
    .replace(/^(the|a|an)\s+/i, "")
    .trim()
    .charAt(0)
    .toUpperCase();
}

type BookSortKey =
  | "recent"
  | "title"
  | "author"
  | "pages"
  | "points"
  | "rating"
  | "date_finished";
type SortDir = "asc" | "desc";
type FictionFilter = "all" | "fiction" | "nonfiction";

const sortLabels: Record<BookSortKey, string> = {
  recent: "Date Added",
  title: "Title",
  author: "Author",
  pages: "Pages",
  points: "Points",
  rating: "Rating",
  date_finished: "Date Finished",
};

const defaultSortDir: Record<BookSortKey, SortDir> = {
  recent: "desc",
  title: "asc",
  author: "asc",
  pages: "desc",
  points: "desc",
  rating: "desc",
  date_finished: "desc",
};

const statConfig = [
  {
    key: "Books",
    icon: BookOpen,
    gradient: "from-indigo-500 to-violet-500",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
  },
  {
    key: "Pages",
    icon: FileText,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  {
    key: "Points",
    icon: Star,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  {
    key: "Avg Rating",
    icon: Heart,
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
  },
] as const;

interface PlayerProfile {
  about_text: string | null;
  goodreads_url: string | null;
  storygraph_url: string | null;
}

export interface RankNeighbor {
  rank: number;
  displayName: string;
  totalPoints: number;
  userId: string;
}

export interface RankContext {
  rank: number;
  totalPlayers: number;
  pointsToNextRank: number | null;
  nextRankName: string | null;
  nextRankRank: number | null;
  pointsAheadOfBehind: number | null;
  behindRankName: string | null;
  behindRankRank: number | null;
  neighbors: RankNeighbor[];
  currentUserId: string;
}

interface PlayerBooksViewProps {
  playerName: string;
  entries: BookEntryWithBook[];
  genres: Array<{ id: string; name: string }>;
  isCurrentUser: boolean;
  isAdmin?: boolean;
  seasonId: string;
  profile?: PlayerProfile;
  scoreBreakdown?: ScoreBreakdownInfo;
  rankContext?: RankContext;
}

function applyFilters(
  entries: BookEntryWithBook[],
  search: string,
  fictionFilter: FictionFilter,
  genreFilter: string,
  letterFilter: string
): BookEntryWithBook[] {
  let result = entries;

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    result = result.filter(
      (e) =>
        e.book.title.toLowerCase().includes(q) ||
        e.book.author.toLowerCase().includes(q)
    );
  }

  if (fictionFilter !== "all") {
    const wantFiction = fictionFilter === "fiction";
    result = result.filter((e) => e.fiction === wantFiction);
  }

  if (genreFilter) {
    result = result.filter((e) => e.genre_id === genreFilter);
  }

  if (letterFilter) {
    result = result.filter(
      (e) => getFirstLetter(e.book?.title ?? "") === letterFilter
    );
  }

  return result;
}

function applySorting(
  entries: BookEntryWithBook[],
  sortKey: BookSortKey,
  sortDir: SortDir
): BookEntryWithBook[] {
  return [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "recent":
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "title":
        cmp = a.book.title.localeCompare(b.book.title);
        break;
      case "author":
        cmp = a.book.author.localeCompare(b.book.author);
        break;
      case "pages":
        cmp = (a.book.pages ?? 0) - (b.book.pages ?? 0);
        break;
      case "points":
        cmp = Number(a.points) - Number(b.points);
        break;
      case "rating":
        cmp = (Number(a.rating) || 0) - (Number(b.rating) || 0);
        break;
      case "date_finished":
        cmp =
          new Date(a.date_finished ?? 0).getTime() -
          new Date(b.date_finished ?? 0).getTime();
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });
}

function NearbyStandings({
  rankContext,
  isCurrentUser,
}: {
  rankContext: RankContext;
  isCurrentUser: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { rank, totalPlayers, neighbors, currentUserId } = rankContext;

  const summaryParts: React.ReactNode[] = [];

  if (rankContext.pointsToNextRank !== null && rankContext.nextRankName && rankContext.nextRankRank !== null) {
    summaryParts.push(
      <span key="ahead" className="inline-flex items-center gap-1 text-gray-500">
        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="tabular-nums font-medium text-gray-700">
          {rankContext.pointsToNextRank.toFixed(1)}
        </span>{" "}
        pts behind{" "}
        <span className="font-medium text-gray-700">
          #{rankContext.nextRankRank} {rankContext.nextRankName}
        </span>
      </span>
    );
  }

  if (rankContext.pointsAheadOfBehind !== null && rankContext.behindRankName && rankContext.behindRankRank !== null) {
    summaryParts.push(
      <span key="behind" className="inline-flex items-center gap-1 text-gray-500">
        <ArrowDownRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="tabular-nums font-medium text-gray-700">
          {rankContext.pointsAheadOfBehind.toFixed(1)}
        </span>{" "}
        pts ahead of{" "}
        <span className="font-medium text-gray-700">
          #{rankContext.behindRankRank} {rankContext.behindRankName}
        </span>
      </span>
    );
  }

  if (rank === 1) {
    summaryParts.push(
      <span key="leading" className="text-amber-600 font-medium">Leading!</span>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-start gap-2.5 text-left hover:bg-gray-50/60 active:bg-gray-100/40 transition-colors cursor-pointer"
      >
        <Trophy className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">
              <span className="font-bold text-gray-900">#{rank}</span>{" "}
              <span className="text-gray-500">of {totalPlayers}</span>
            </span>
            {summaryParts.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                {summaryParts.map((part, i) => (
                  <span key={i}>{part}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-300 shrink-0 mt-0.5 transition-transform duration-200",
            expanded && "rotate-180 text-gray-500"
          )}
        />
      </button>

      {expanded && neighbors.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-3 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Nearby Standings
          </p>
          <div className="space-y-0.5">
            {neighbors.map((neighbor) => {
              const isMe = neighbor.userId === currentUserId;
              const gap = isMe
                ? null
                : neighbor.rank < rank
                  ? neighbor.totalPoints - (neighbors.find((n) => n.userId === currentUserId)?.totalPoints ?? 0)
                  : (neighbors.find((n) => n.userId === currentUserId)?.totalPoints ?? 0) - neighbor.totalPoints;

              return (
                <div
                  key={neighbor.userId}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm",
                    isMe
                      ? "bg-indigo-50 border border-indigo-200/60"
                      : "hover:bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 text-right font-bold tabular-nums text-sm",
                      isMe ? "text-indigo-700" : "text-gray-400"
                    )}
                  >
                    #{neighbor.rank}
                  </span>
                  <span
                    className={cn(
                      "flex-1 truncate font-medium",
                      isMe ? "text-indigo-700" : "text-gray-700"
                    )}
                  >
                    {isMe && isCurrentUser ? "You" : neighbor.displayName}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-semibold text-sm",
                      isMe ? "text-indigo-700" : "text-gray-600"
                    )}
                  >
                    {neighbor.totalPoints.toFixed(1)}
                  </span>
                  {gap !== null && (
                    <span
                      className={cn(
                        "text-xs tabular-nums w-16 text-right",
                        neighbor.rank < rank
                          ? "text-emerald-600"
                          : "text-amber-600"
                      )}
                    >
                      {neighbor.rank < rank ? `+${gap.toFixed(1)}` : `-${gap.toFixed(1)}`}
                    </span>
                  )}
                  {isMe && <span className="w-16" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function PlayerBooksView({
  playerName,
  entries,
  genres,
  isCurrentUser,
  isAdmin = false,
  seasonId,
  profile,
  scoreBreakdown,
  rankContext,
}: PlayerBooksViewProps) {
  const [selectedEntry, setSelectedEntry] =
    useState<BookEntryWithBook | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<BookSortKey>("recent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [fictionFilter, setFictionFilter] = useState<FictionFilter>("all");
  const [genreFilter, setGenreFilter] = useState("");
  const [letterFilter, setLetterFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const bookListRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    search.trim() !== "" || fictionFilter !== "all" || genreFilter !== "" || letterFilter !== "";
  const activeFilterCount =
    (search.trim() !== "" ? 1 : 0) +
    (fictionFilter !== "all" ? 1 : 0) +
    (genreFilter !== "" ? 1 : 0) +
    (letterFilter !== "" ? 1 : 0);

  function handleSortChange(key: BookSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir[key]);
    }
  }

  function clearFilters() {
    setSearch("");
    setFictionFilter("all");
    setGenreFilter("");
    setLetterFilter("");
  }

  const allCurrentlyReading = entries.filter((e) => e.status === "reading");
  const allCompleted = entries.filter((e) => e.status === "completed");
  const allDnf = entries.filter((e) => e.status === "did_not_finish");
  const allFinished = entries.filter(
    (e) => e.status === "completed" || e.status === "did_not_finish"
  );

  const filteredReading = useMemo(
    () => applyFilters(allCurrentlyReading, search, fictionFilter, genreFilter, letterFilter),
    [allCurrentlyReading, search, fictionFilter, genreFilter, letterFilter]
  );

  const filteredCompleted = useMemo(
    () =>
      applySorting(
        applyFilters(allCompleted, search, fictionFilter, genreFilter, letterFilter),
        sortKey,
        sortDir
      ),
    [allCompleted, search, fictionFilter, genreFilter, letterFilter, sortKey, sortDir]
  );

  const filteredDnf = useMemo(
    () =>
      applySorting(
        applyFilters(allDnf, search, fictionFilter, genreFilter, letterFilter),
        sortKey,
        sortDir
      ),
    [allDnf, search, fictionFilter, genreFilter, letterFilter, sortKey, sortDir]
  );

  const totalBooks = allFinished.length;
  const confirmedPoints = allFinished.reduce(
    (sum, e) => sum + Number(e.points),
    0
  );
  const pendingPoints = allCurrentlyReading.reduce(
    (sum, e) => sum + Number(e.points),
    0
  );
  const totalPages = allFinished.reduce(
    (sum, e) => {
      if (e.status === "did_not_finish") return sum + (e.pages_read ?? 0);
      return sum + (e.book?.pages ?? 0);
    },
    0
  );
  const ratedEntries = allFinished.filter((e) => e.rating !== null);
  const avgRating =
    ratedEntries.length > 0
      ? ratedEntries.reduce((sum, e) => sum + (Number(e.rating) || 0), 0) /
        ratedEntries.length
      : 0;

  const statValues = [
    totalBooks,
    totalPages.toLocaleString(),
    confirmedPoints.toFixed(1),
    avgRating.toFixed(1),
  ];

  // Challenge progress uses only fully completed books (not DNF).
  // This could become an org-level setting in the future.
  const coveredGenreIds = new Set(
    allCompleted
      .map((e) => e.genre_id)
      .filter((g): g is string => g !== null)
  );
  const coveredLetters = new Set(
    allCompleted.map((e) => getFirstLetter(e.book?.title ?? ""))
  );
  const countries = [
    ...new Set(
      allCompleted
        .map((e) => e.book?.country)
        .filter(
          (c): c is string => c !== null && c !== undefined && c !== ""
        )
    ),
  ];

  const genreBookCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of allCompleted) {
      if (entry.genre_id) {
        counts.set(entry.genre_id, (counts.get(entry.genre_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [allCompleted]);

  const letterBookCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of allCompleted) {
      const letter = getFirstLetter(entry.book?.title ?? "");
      if (letter) {
        counts.set(letter, (counts.get(letter) ?? 0) + 1);
      }
    }
    return counts;
  }, [allCompleted]);

  const scrollToBooks = useCallback(() => {
    setTimeout(() => {
      bookListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const handleGenrePillClick = useCallback((genreId: string) => {
    setGenreFilter((prev) => prev === genreId ? "" : genreId);
    setLetterFilter("");
    scrollToBooks();
  }, [scrollToBooks]);

  const handleLetterPillClick = useCallback((letter: string) => {
    setLetterFilter((prev) => prev === letter ? "" : letter);
    setGenreFilter("");
    scrollToBooks();
  }, [scrollToBooks]);

  const [bookListExpanded, setBookListExpanded] = useState(false);

  const canModify = isCurrentUser || isAdmin;
  const title = isCurrentUser ? "My Books" : `${playerName}'s Books`;

  function handleCardClick(entry: BookEntryWithBook) {
    setSelectedEntry(entry);
    setPanelOpen(true);
  }

  function handlePanelClose() {
    setPanelOpen(false);
    setSelectedEntry(null);
  }

  const hasLinks = profile?.goodreads_url || profile?.storygraph_url;
  const hasAbout = profile?.about_text;
  const showProfileBlock = hasAbout || hasLinks;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        {showProfileBlock && (
          <div className="mt-3 space-y-2">
            {hasAbout && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {profile.about_text}
              </p>
            )}
            {hasLinks && (
              <div className="flex flex-wrap items-center gap-3">
                {profile.goodreads_url && (
                  <a
                    href={profile.goodreads_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Goodreads
                  </a>
                )}
                {profile.storygraph_url && (
                  <a
                    href={profile.storygraph_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    The StoryGraph
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {isCurrentUser && !showProfileBlock && (
          <Link
            href="/settings"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Settings className="h-3 w-3" />
            Add a bio or reading profile links
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statConfig.map((stat, i) => (
          <div
            key={stat.key}
            className="relative overflow-hidden bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div
              className={`absolute top-3 right-3 ${stat.bg} rounded-lg p-1.5`}
            >
              <stat.icon className={`h-4 w-4 ${stat.text}`} />
            </div>
            <div className={`text-2xl font-bold ${stat.text}`}>
              {statValues[i]}
            </div>
            <div className="text-xs font-medium text-gray-500 mt-1">
              {stat.key}
            </div>
            {stat.key === "Points" && pendingPoints > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <BookMarked className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">
                  +{pendingPoints.toFixed(1)} pending
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rank context */}
      {rankContext && (
        <NearbyStandings rankContext={rankContext} isCurrentUser={isCurrentUser} />
      )}

      {/* Score Breakdown */}
      {scoreBreakdown && allFinished.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4.5 w-4.5 text-indigo-200" />
              <h3 className="font-semibold text-white">Score Breakdown</h3>
            </div>
            <span className="text-xl font-extrabold text-white">
              {scoreBreakdown.grandTotal.toFixed(1)}
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Book Points */}
            <div className="px-5 py-4">
              <button
                onClick={() => setBookListExpanded((v) => !v)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 rounded-lg p-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className="font-medium text-gray-900 text-sm">
                    Book Points
                  </span>
                  <span className="text-xs text-gray-400">
                    ({allFinished.length} {allFinished.length === 1 ? "book" : "books"})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">
                    {confirmedPoints.toFixed(1)}
                  </span>
                  {bookListExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  )}
                </div>
              </button>

              {bookListExpanded && (
                <div className="mt-3 ml-9 space-y-1.5">
                  {allFinished
                    .sort((a, b) => Number(b.points) - Number(a.points))
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-600 truncate mr-3">
                          {entry.book.title}
                          {entry.status === "did_not_finish" && (
                            <span className="text-gray-400 ml-1">(DNF)</span>
                          )}
                        </span>
                        <span className="font-medium text-gray-700 tabular-nums shrink-0">
                          {Number(entry.points).toFixed(1)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Season Bonuses */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-50 rounded-lg p-1.5">
                    <Trophy className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-gray-900 text-sm">
                    Challenge Bonuses
                  </span>
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  {(
                    scoreBreakdown.seasonBonuses.genreComplete +
                    scoreBreakdown.seasonBonuses.alphabet
                  ).toFixed(1)}
                </span>
              </div>
              <div className="ml-9 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(
                    "text-gray-600",
                    scoreBreakdown.seasonBonuses.genreComplete > 0 && "text-emerald-700"
                  )}>
                    Genre Challenge
                    {scoreBreakdown.seasonBonuses.genreComplete > 0 && " ✓"}
                  </span>
                  <span className={cn(
                    "font-medium tabular-nums",
                    scoreBreakdown.seasonBonuses.genreComplete > 0
                      ? "text-emerald-700"
                      : "text-gray-400"
                  )}>
                    {scoreBreakdown.seasonBonuses.genreComplete > 0
                      ? `+${scoreBreakdown.seasonBonuses.genreComplete.toFixed(1)}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(
                    "text-gray-600",
                    scoreBreakdown.seasonBonuses.alphabet > 0 && "text-emerald-700"
                  )}>
                    Alphabet Challenge
                    {scoreBreakdown.seasonBonuses.uniqueLetters >= 26
                      ? ` (26 letters)${scoreBreakdown.seasonBonuses.alphabet > 0 ? " ✓" : ""}`
                      : scoreBreakdown.seasonBonuses.uniqueLetters >= 13
                        ? ` (13+ letters)${scoreBreakdown.seasonBonuses.alphabet > 0 ? " ✓" : ""}`
                        : ` (${scoreBreakdown.seasonBonuses.uniqueLetters}/13)`}
                  </span>
                  <span className={cn(
                    "font-medium tabular-nums",
                    scoreBreakdown.seasonBonuses.alphabet > 0
                      ? "text-emerald-700"
                      : "text-gray-400"
                  )}>
                    {scoreBreakdown.seasonBonuses.alphabet > 0
                      ? `+${scoreBreakdown.seasonBonuses.alphabet.toFixed(1)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Longest Road Bonuses */}
            {(scoreBreakdown.longestRoad.countryBonus > 0 ||
              scoreBreakdown.longestRoad.seriesBonus > 0) && (
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-violet-50 rounded-lg p-1.5">
                      <Route className="h-4 w-4 text-violet-600" />
                    </div>
                    <span className="font-medium text-gray-900 text-sm">
                      Longest Road Bonuses
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">
                    {(
                      scoreBreakdown.longestRoad.countryBonus +
                      scoreBreakdown.longestRoad.seriesBonus
                    ).toFixed(1)}
                  </span>
                </div>
                <div className="ml-9 space-y-1.5">
                  {scoreBreakdown.longestRoad.countryBonus > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700">
                        Most Countries
                        <span className="text-gray-400 ml-1">
                          (#{scoreBreakdown.longestRoad.countryRank})
                        </span>
                      </span>
                      <span className="font-medium text-emerald-700 tabular-nums">
                        +{scoreBreakdown.longestRoad.countryBonus.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {scoreBreakdown.longestRoad.seriesBonus > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700">
                        Longest Series
                        {scoreBreakdown.longestRoad.bestSeriesName && (
                          <span className="text-gray-400 ml-1">
                            ({scoreBreakdown.longestRoad.bestSeriesName}, #{scoreBreakdown.longestRoad.seriesRank})
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-emerald-700 tabular-nums">
                        +{scoreBreakdown.longestRoad.seriesBonus.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="px-5 py-3 bg-gray-50/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">
                  Total Points
                </span>
                <span className="font-bold text-indigo-700 text-base">
                  {scoreBreakdown.grandTotal.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genre Challenge */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <GenreGrid
          genres={genres}
          coveredGenreIds={coveredGenreIds}
          genreBookCounts={genreBookCounts}
          activeGenreFilter={genreFilter}
          onGenreClick={handleGenrePillClick}
        />
      </div>

      {/* Alphabet Challenge */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <AlphabetGrid
          coveredLetters={coveredLetters}
          letterBookCounts={letterBookCounts}
          activeLetterFilter={letterFilter}
          onLetterClick={handleLetterPillClick}
        />
      </div>

      {/* Countries */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="font-semibold text-gray-900">Countries Read</h3>
          </div>
          <span className="text-sm font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            {countries.length} unique
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => (
            <span
              key={c}
              className="px-2.5 py-1 bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 rounded-full text-sm font-medium border border-violet-200/50"
            >
              {c}
            </span>
          ))}
          {countries.length === 0 && (
            <p className="text-sm text-gray-400">
              No countries recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      {(totalBooks > 0 || allCurrentlyReading.length > 0) && (
        <div ref={bookListRef} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          {/* Search + mobile filter toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or author..."
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
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "md:hidden flex items-center gap-1.5 h-11 px-3 rounded-lg border text-xs font-medium transition-colors shrink-0",
                filtersOpen || hasActiveFilters
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-500"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-indigo-600 text-white text-xs px-1">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Sort & Filter controls — always visible on desktop, toggleable on mobile */}
          <div className={cn(
            "flex-wrap items-center gap-2",
            filtersOpen ? "flex" : "hidden md:flex"
          )}>
            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="book-sort"
                className="text-xs font-medium text-gray-500"
              >
                Sort:
              </label>
              <select
                id="book-sort"
                value={sortKey}
                onChange={(e) =>
                  handleSortChange(e.target.value as BookSortKey)
                }
                className="text-xs h-11 md:h-7 pl-2 pr-6 rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-indigo-300 cursor-pointer"
              >
                {(Object.keys(sortLabels) as BookSortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {sortLabels[key]}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                }
                className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-500 transition-colors"
                aria-label={sortDir === "desc" ? "Sort descending" : "Sort ascending"}
              >
                {sortDir === "desc" ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="h-5 w-px bg-gray-200" />

            {/* Fiction filter */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {(["all", "fiction", "nonfiction"] as FictionFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFictionFilter(f)}
                    className={cn(
                      "px-3 py-2 md:py-1 text-xs font-medium transition-colors",
                      fictionFilter === f
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {f === "all"
                      ? "All"
                      : f === "fiction"
                        ? "Fiction"
                        : "Nonfiction"}
                  </button>
                )
              )}
            </div>

            {/* Genre filter */}
            {genres.length > 0 && (
              <>
                <div className="h-5 w-px bg-gray-200 hidden sm:block" />
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="text-xs h-11 md:h-7 pl-2 pr-6 rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-indigo-300 cursor-pointer"
                >
                  <option value="">All Genres</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <>
                <div className="h-5 w-px bg-gray-200" />
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 active:text-indigo-900 transition-colors py-2 px-1"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>

          {/* Active challenge filter chip */}
          {(letterFilter || genreFilter) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Showing:</span>
              {genreFilter && (
                <button
                  onClick={() => setGenreFilter("")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 hover:bg-emerald-100 transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  {genres.find((g) => g.id === genreFilter)?.name ?? "Genre"}
                  <X className="h-3 w-3" />
                </button>
              )}
              {letterFilter && (
                <button
                  onClick={() => setLetterFilter("")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1 hover:bg-indigo-100 transition-colors"
                >
                  <BookA className="h-3 w-3" />
                  Starts with &ldquo;{letterFilter}&rdquo;
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Currently Reading */}
      {filteredReading.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookMarked className="h-4.5 w-4.5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">
              Currently Reading ({filteredReading.length}
              {hasActiveFilters &&
                filteredReading.length !== allCurrentlyReading.length &&
                ` of ${allCurrentlyReading.length}`}
              )
            </h2>
          </div>
          <div className="space-y-3">
            {filteredReading.map((entry) => (
              <BookEntryCard
                key={entry.id}
                entry={entry}
                genreName={entry.genre_name ?? undefined}
                onClick={() => handleCardClick(entry)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed book list */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Library className="h-4.5 w-4.5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">
            Completed ({filteredCompleted.length}
            {hasActiveFilters &&
              filteredCompleted.length !== allCompleted.length &&
              ` of ${allCompleted.length}`}
            )
          </h2>
        </div>
        {entries.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {isCurrentUser
                ? "No books logged yet"
                : `${playerName} hasn\u2019t logged any books yet`}
            </p>
            {isCurrentUser && (
              <p className="text-sm text-gray-400 mt-1">
                Tap &ldquo;Add Book&rdquo; to get started!
              </p>
            )}
          </div>
        ) : filteredCompleted.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">
              {hasActiveFilters
                ? "No books match your filters."
                : "No completed books yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCompleted.map((entry) => (
              <BookEntryCard
                key={entry.id}
                entry={entry}
                genreName={entry.genre_name ?? undefined}
                onClick={() => handleCardClick(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Did Not Finish */}
      {filteredDnf.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4.5 w-4.5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">
              Did Not Finish ({filteredDnf.length}
              {hasActiveFilters &&
                filteredDnf.length !== allDnf.length &&
                ` of ${allDnf.length}`}
              )
            </h2>
          </div>
          <div className="space-y-3">
            {filteredDnf.map((entry) => (
              <BookEntryCard
                key={entry.id}
                entry={entry}
                genreName={entry.genre_name ?? undefined}
                onClick={() => handleCardClick(entry)}
              />
            ))}
          </div>
        </div>
      )}

      <BookEntryPanel
        open={panelOpen}
        onClose={handlePanelClose}
        genres={genres}
        seasonId={seasonId}
        entry={selectedEntry ?? undefined}
        canEdit={canModify}
        canDelete={canModify}
      />
    </div>
  );
}
