import {
  getOrgGenres,
  getUserOrganizations,
} from "@/lib/queries/organizations";
import { Badge } from "@/components/ui/badge";

export default async function AdminGenresPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const genres = await getOrgGenres(currentOrg.id);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Genre Challenge List</h2>
      <p className="text-sm text-gray-500">
        Players earn a bonus for covering all genres. Customize the list for
        your competition.
      </p>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Badge
            key={genre.id}
            variant="secondary"
            className="text-sm py-1.5 px-3"
          >
            {genre.name}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Genre add/remove functionality will use client-side forms with the
        addGenre/removeGenre actions.
      </p>
    </div>
  );
}
