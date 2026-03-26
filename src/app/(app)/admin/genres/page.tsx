import {
  getOrgGenres,
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { GenreManager } from "@/components/genre-manager";

export default async function AdminGenresPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const genres = await getOrgGenres(currentOrg.id);

  return (
    <GenreManager
      orgId={currentOrg.id}
      initialGenres={genres.map((g) => ({ id: g.id, name: g.name }))}
    />
  );
}
