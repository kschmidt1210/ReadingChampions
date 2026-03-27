import { createClient } from "@/lib/supabase/server";
import { getUserBookEntries } from "@/lib/queries/books";
import {
  getActiveSeason,
  getUserOrganizations,
  getCurrentOrg,
  getOrgGenres,
} from "@/lib/queries/organizations";
import { PlayerBooksView } from "@/components/player-books-view";
import type { BookEntryWithBook } from "@/types/database";

export default async function MyBooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
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

  return (
    <PlayerBooksView
      playerName=""
      entries={entries}
      genres={genres}
      genreMap={genreMap}
      isCurrentUser={true}
      isAdmin={currentOrg.role === "admin"}
    />
  );
}
