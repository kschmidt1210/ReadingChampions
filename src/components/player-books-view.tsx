"use client";

import { useState } from "react";
import { BookOpen, FileText, Star, Heart, Globe, Library, BookMarked } from "lucide-react";
import { BookEntryCard } from "@/components/book-entry-card";
import { BookEntryPanel } from "@/components/book-entry-panel";
import { GenreGrid } from "@/components/genre-grid";
import { AlphabetGrid } from "@/components/alphabet-grid";
import type { BookEntryWithBook } from "@/types/database";

function getFirstLetter(title: string): string {
  return title
    .replace(/^(the|a|an)\s+/i, "")
    .trim()
    .charAt(0)
    .toUpperCase();
}

const statConfig = [
  { key: "Books", icon: BookOpen, gradient: "from-indigo-500 to-violet-500", bg: "bg-indigo-50", text: "text-indigo-700" },
  { key: "Pages", icon: FileText, gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  { key: "Points", icon: Star, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-700" },
  { key: "Avg Rating", icon: Heart, gradient: "from-rose-500 to-pink-500", bg: "bg-rose-50", text: "text-rose-700" },
] as const;

interface PlayerBooksViewProps {
  playerName: string;
  entries: BookEntryWithBook[];
  genres: Array<{ id: string; name: string }>;
  isCurrentUser: boolean;
  isAdmin?: boolean;
  seasonId: string;
}

export function PlayerBooksView({
  playerName,
  entries,
  genres,
  isCurrentUser,
  isAdmin = false,
  seasonId,
}: PlayerBooksViewProps) {
  const [selectedEntry, setSelectedEntry] = useState<BookEntryWithBook | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const currentlyReading = entries.filter((e) => !e.completed);
  const completedEntries = entries.filter((e) => e.completed);

  const totalBooks = completedEntries.length;
  const totalPoints = entries.reduce((sum, e) => sum + Number(e.points), 0);
  const totalPages = completedEntries.reduce((sum, e) => sum + (e.book?.pages ?? 0), 0);
  const avgRating =
    totalBooks > 0
      ? completedEntries.reduce((sum, e) => sum + (Number(e.rating) || 0), 0) / totalBooks
      : 0;

  const statValues = [
    totalBooks,
    totalPages.toLocaleString(),
    totalPoints.toFixed(1),
    avgRating.toFixed(1),
  ];

  const coveredGenreIds = new Set(
    completedEntries.map((e) => e.genre_id).filter((g): g is string => g !== null)
  );
  const coveredLetters = new Set(
    completedEntries.map((e) => getFirstLetter(e.book?.title ?? ""))
  );
  const countries = [
    ...new Set(
      completedEntries
        .map((e) => e.book?.country)
        .filter((c): c is string => c !== null && c !== undefined && c !== "")
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

      {/* Currently Reading */}
      {currentlyReading.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookMarked className="h-4.5 w-4.5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">
              Currently Reading ({currentlyReading.length})
            </h2>
          </div>
          <div className="space-y-3">
            {currentlyReading.map((entry) => (
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statConfig.map((stat, i) => (
          <div
            key={stat.key}
            className="relative overflow-hidden bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className={`absolute top-3 right-3 ${stat.bg} rounded-lg p-1.5`}>
              <stat.icon className={`h-4 w-4 ${stat.text}`} />
            </div>
            <div className={`text-2xl font-bold ${stat.text}`}>
              {statValues[i]}
            </div>
            <div className="text-xs font-medium text-gray-500 mt-1">{stat.key}</div>
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

      {/* Completed book list */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Library className="h-4.5 w-4.5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">
            Completed Books ({totalBooks})
          </h2>
        </div>
        {totalBooks === 0 && currentlyReading.length === 0 ? (
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
        ) : totalBooks === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">
              No completed books yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedEntries.map((entry) => (
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
