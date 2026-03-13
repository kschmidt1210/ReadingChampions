import { BookEntryCard } from "@/components/book-entry-card";
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

interface PlayerBooksViewProps {
  playerName: string;
  entries: BookEntryWithBook[];
  genres: Array<{ id: string; name: string }>;
  genreMap: Map<string, string>;
  isCurrentUser: boolean;
}

export function PlayerBooksView({
  playerName,
  entries,
  genres,
  genreMap,
  isCurrentUser,
}: PlayerBooksViewProps) {
  const totalBooks = entries.length;
  const totalPoints = entries.reduce((sum, e) => sum + Number(e.points), 0);
  const totalPages = entries.reduce((sum, e) => sum + (e.book?.pages ?? 0), 0);
  const avgRating =
    totalBooks > 0
      ? entries.reduce((sum, e) => sum + (Number(e.rating) || 0), 0) /
        totalBooks
      : 0;

  const coveredGenreIds = new Set(
    entries.map((e) => e.genre_id).filter((g): g is string => g !== null)
  );
  const coveredLetters = new Set(
    entries.map((e) => getFirstLetter(e.book?.title ?? ""))
  );
  const countries = [
    ...new Set(
      entries
        .map((e) => e.book?.country)
        .filter((c): c is string => c !== null && c !== undefined && c !== "")
    ),
  ];

  const title = isCurrentUser ? "My Books" : `${playerName}'s Books`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Books", value: totalBooks },
          { label: "Pages", value: totalPages.toLocaleString() },
          { label: "Points", value: totalPoints.toFixed(1) },
          { label: "Avg Rating", value: avgRating.toFixed(1) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-4 text-center shadow-sm"
          >
            <div className="text-2xl font-bold text-indigo-600">
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Genre Challenge */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <GenreGrid genres={genres} coveredGenreIds={coveredGenreIds} />
      </div>

      {/* Alphabet Challenge */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <AlphabetGrid coveredLetters={coveredLetters} />
      </div>

      {/* Countries */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold text-gray-900">Countries Read</h3>
          <span className="text-sm text-gray-500">
            {countries.length} unique
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => (
            <span
              key={c}
              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
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

      {/* Book list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">
          Logged Books ({totalBooks})
        </h2>
        {totalBooks === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {isCurrentUser
              ? 'No books logged yet. Tap \u201CAdd Book\u201D to get started!'
              : `${playerName} hasn\u2019t logged any books yet.`}
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <BookEntryCard
                key={entry.id}
                entry={entry}
                genreName={
                  entry.genre_id ? genreMap.get(entry.genre_id) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
