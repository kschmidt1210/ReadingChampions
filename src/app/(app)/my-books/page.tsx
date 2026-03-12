import { createClient } from "@/lib/supabase/server";
import { getUserBookEntries } from "@/lib/queries/books";
import {
  getActiveSeason,
  getUserOrganizations,
  getOrgGenres,
} from "@/lib/queries/organizations";
import { BookEntryCard } from "@/components/book-entry-card";
import type { BookEntryWithBook } from "@/types/database";

export default async function MyBooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg)
    return (
      <div className="p-8 text-center">Join a competition to get started!</div>
    );

  const season = await getActiveSeason(currentOrg.id);
  if (!season)
    return <div className="p-8 text-center">No active season.</div>;

  const entries = (await getUserBookEntries(
    season.id,
    user.id
  )) as BookEntryWithBook[];
  const genres = await getOrgGenres(currentOrg.id);
  const genreMap = new Map(genres.map((g) => [g.id, g.name]));

  const totalPoints = entries.reduce((sum, e) => sum + Number(e.points), 0);
  const totalPages = entries.reduce((sum, e) => sum + (e.book?.pages ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-lg font-bold text-gray-900">My Books</h1>
        <div className="text-sm text-gray-500">
          {entries.length} books &middot; {totalPages.toLocaleString()} pages
          &middot; {totalPoints.toFixed(1)} pts
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No books logged yet. Tap &ldquo;Add Book&rdquo; to get started!
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
  );
}
