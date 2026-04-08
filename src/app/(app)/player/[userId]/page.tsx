import { notFound } from "next/navigation";
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

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return notFound();

  const { data: membership } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", currentOrg.id)
    .eq("user_id", userId)
    .single();

  if (!membership) return notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, about_text, goodreads_url, storygraph_url")
    .eq("id", userId)
    .single();

  const playerName = profile?.display_name ?? "Unknown Player";

  const season = await getActiveSeason(currentOrg.id);
  if (!season)
    return <div className="p-8 text-center">No active season.</div>;

  const entries = (await getUserBookEntries(
    season.id,
    userId
  )) as BookEntryWithBook[];
  const genres = await getOrgGenres(currentOrg.id);

  return (
    <PlayerBooksView
      playerName={playerName}
      entries={entries}
      genres={genres}
      isCurrentUser={user.id === userId}
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
