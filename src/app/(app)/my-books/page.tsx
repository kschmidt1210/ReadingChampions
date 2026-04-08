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

  const [entries, genres, { data: profile }] = await Promise.all([
    getUserBookEntries(season.id, user.id) as Promise<BookEntryWithBook[]>,
    getOrgGenres(currentOrg.id),
    supabase
      .from("profiles")
      .select("about_text, goodreads_url, storygraph_url")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <PlayerBooksView
      playerName=""
      entries={entries}
      genres={genres}
      isCurrentUser={true}
      isAdmin={currentOrg.role === "admin"}
      seasonId={season.id}
      profile={{
        about_text: profile?.about_text ?? null,
        goodreads_url: profile?.goodreads_url ?? null,
        storygraph_url: profile?.storygraph_url ?? null,
      }}
    />
  );
}
