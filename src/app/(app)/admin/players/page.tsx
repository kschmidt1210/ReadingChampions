import {
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { getOrgMembers } from "@/lib/queries/admin";
import { Badge } from "@/components/ui/badge";

export default async function AdminPlayersPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) return null;

  const members = await getOrgMembers(currentOrg.id);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Players ({members.length})</h2>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {members.map((member: any) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4"
          >
            <div>
              <p className="font-medium">
                {member.profile?.display_name ?? "Unknown"}
              </p>
              <p className="text-xs text-gray-400">
                Joined {new Date(member.joined_at).toLocaleDateString()}
              </p>
            </div>
            <Badge
              variant={member.role === "admin" ? "default" : "secondary"}
            >
              {member.role}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
