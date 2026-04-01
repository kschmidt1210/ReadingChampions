"use client";

import { useState, useMemo } from "react";
import {
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
} from "lucide-react";
import { BookEntryCard } from "@/components/book-entry-card";
import { BookEntryPanel } from "@/components/book-entry-panel";
import { GenreGrid } from "@/components/genre-grid";
import { AlphabetGrid } from "@/components/alphabet-grid";
import type { BookEntryWithBook } from "@/types/database";
import { cn } from "@/lib/utils";

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

interface PlayerBooksViewProps {
  playerName: string;
  entries: BookEntryWithBook[];
  genres: Array<{ id: string; name: string }>;
  isCurrentUser: boolean;
  isAdmin?: boolean;
  seasonId: string;
}

function applyFilters(
  entries: BookEntryWithBook[],
  search: string,
  fictionFilter: FictionFilter,
  genreFilter: string
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

export function PlayerBooksView({
  playerName,
  entries,
  genres,
  isCurrentUser,
  isAdmin = false,
  seasonId,
}: PlayerBooksViewProps) {
  const [selectedEntry, setSelectedEntry] =
    useState<BookEntryWithBook | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<BookSortKey>("recent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [fictionFilter, setFictionFilter] = useState<FictionFilter>("all");
  const [genreFilter, setGenreFilter] = useState("");

  const hasActiveFilters =
    search.trim() !== "" || fictionFilter !== "all" || genreFilter !== "";

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
  }

  const allCurrentlyReading = entries.filter((e) => !e.completed);
  const allCompleted = entries.filter((e) => e.completed);

  const filteredReading = useMemo(
    () => applyFilters(allCurrentlyReading, search, fictionFilter, genreFilter),
    [allCurrentlyReading, search, fictionFilter, genreFilter]
  );

  const filteredCompleted = useMemo(
    () =>
      applySorting(
        applyFilters(allCompleted, search, fictionFilter, genreFilter),
        sortKey,
        sortDir
      ),
    [allCompleted, search, fictionFilter, genreFilter, sortKey, sortDir]
  );

  const totalBooks = allCompleted.length;
  const totalPoints = entries.reduce((sum, e) => sum + Number(e.points), 0);
  const totalPages = allCompleted.reduce(
    (sum, e) => sum + (e.book?.pages ?? 0),
    0
  );
  const avgRating =
    totalBooks > 0
      ? allCompleted.reduce((sum, e) => sum + (Number(e.rating) || 0), 0) /
        totalBooks
      : 0;

  const statValues = [
    totalBooks,
    totalPages.toLocaleString(),
    totalPoints.toFixed(1),
    avgRating.toFixed(1),
  ];

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

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
          </div>
        ))}
      </div>

      {/* Genre Challenge */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <GenreGrid genres={genres} coveredGenreIds={coveredGenreIds} />
      </div>

      {/* Alphabet Challenge */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <AlphabetGrid coveredLetters={coveredLetters} />
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or author..."
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

          {/* Sort & Filter controls */}
          <div className="flex flex-wrap items-center gap-2">
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
                className="text-xs h-7 pl-2 pr-6 rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-indigo-300 cursor-pointer"
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
                className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                title={sortDir === "desc" ? "Descending" : "Ascending"}
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
                      "px-2.5 py-1 text-xs font-medium transition-colors",
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
                  className="text-xs h-7 pl-2 pr-6 rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-indigo-300 cursor-pointer"
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
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
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
            Completed Books ({filteredCompleted.length}
            {hasActiveFilters &&
              filteredCompleted.length !== totalBooks &&
              ` of ${totalBooks}`}
            )
          </h2>
        </div>
        {totalBooks === 0 && allCurrentlyReading.length === 0 ? (
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
