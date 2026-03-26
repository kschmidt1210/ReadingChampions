import {
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { getFlaggedEntries } from "@/lib/queries/admin";
import { FlaggedEntryCard } from "@/components/flagged-entry-card";

export default async function AdminFlaggedPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const flagged = await getFlaggedEntries(currentOrg.id);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Flagged Entries</h2>
      {flagged.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          No flagged entries. All clear!
        </p>
      ) : (
        <div className="space-y-3">
          {flagged.map((flag: any) => (
            <FlaggedEntryCard key={flag.id} flag={flag} />
          ))}
        </div>
      )}
    </div>
  );
}
