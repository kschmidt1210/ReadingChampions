import { createClient } from "@/lib/supabase/server";
import { getUserBookEntries } from "@/lib/queries/books";
import {
  getActiveSeason,
  getUserOrganizations,
  getOrgGenres,
} from "@/lib/queries/organizations";
import { GenreGrid } from "@/components/genre-grid";
import { AlphabetGrid } from "@/components/alphabet-grid";

function getFirstLetter(title: string): string {
  return title
    .replace(/^(the|a|an)\s+/i, "")
    .trim()
    .charAt(0)
    .toUpperCase();
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const season = await getActiveSeason(currentOrg.id);
  if (!season)
    return <div className="p-8 text-center">No active season.</div>;

  const entries = await getUserBookEntries(season.id, user.id);
  const genres = await getOrgGenres(currentOrg.id);

  const coveredGenreIds = new Set(
    entries
      .map((e: any) => e.genre_id)
      .filter(Boolean) as string[]
  );

  const coveredLetters = new Set(
    entries.map((e: any) => getFirstLetter(e.book?.title ?? ""))
  );

  const countries = [
    ...new Set(
      entries
        .map((e: any) => e.book?.country)
        .filter(Boolean) as string[]
    ),
  ];

  const totalBooks = entries.length;
  const totalPages = entries.reduce(
    (sum, e: any) => sum + (e.book?.pages ?? 0),
    0
  );
  const totalPoints = entries.reduce(
    (sum, e: any) => sum + Number(e.points),
    0
  );
  const avgRating =
    totalBooks > 0
      ? entries.reduce((sum, e: any) => sum + (Number(e.rating) || 0), 0) /
        totalBooks
      : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-lg font-bold text-gray-900">My Progress</h1>

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

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <GenreGrid genres={genres} coveredGenreIds={coveredGenreIds} />
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <AlphabetGrid coveredLetters={coveredLetters} />
      </div>

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
    </div>
  );
}
