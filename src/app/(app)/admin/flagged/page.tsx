import {
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { getFlaggedEntries } from "@/lib/queries/admin";
import { FlaggedList } from "@/components/flagged-list";

export default async function AdminFlaggedPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const [unresolvedFlags, resolvedFlags] = await Promise.all([
    getFlaggedEntries(currentOrg.id, "unresolved"),
    getFlaggedEntries(currentOrg.id, "resolved"),
  ]);

  return (
    <FlaggedList
      unresolvedFlags={unresolvedFlags}
      resolvedFlags={resolvedFlags}
    />
  );
}
