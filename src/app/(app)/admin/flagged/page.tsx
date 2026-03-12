import { getUserOrganizations } from "@/lib/queries/organizations";
import { getFlaggedEntries } from "@/lib/queries/admin";
import { Badge } from "@/components/ui/badge";

export default async function AdminFlaggedPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
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
            <div
              key={flag.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {flag.book_entry?.book?.title ?? "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    by {flag.book_entry?.profile?.display_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Points: {Number(flag.book_entry?.points ?? 0).toFixed(2)}
                  </p>
                </div>
                <Badge variant="destructive">
                  {flag.reason.replace("_", " ")}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
