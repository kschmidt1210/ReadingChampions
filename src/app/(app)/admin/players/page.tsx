import { createClient } from "@/lib/supabase/server";
import {
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { getOrgMembersWithEmail } from "@/lib/queries/admin";
import { getManagedPlayersForOrg } from "@/lib/actions/managed-players";
import { PlayerManager } from "@/components/player-manager";

export default async function AdminPlayersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg || !user) return null;

  const [members, managedLinks] = await Promise.all([
    getOrgMembersWithEmail(currentOrg.id),
    getManagedPlayersForOrg(currentOrg.id),
  ]);

  return (
    <PlayerManager
      orgId={currentOrg.id}
      initialMembers={members as any}
      currentUserId={user.id}
      managedPlayerLinks={managedLinks.map((l) => ({
        id: l.id,
        parentUserId: l.parent_user_id,
        managedUserId: l.managed_user_id,
      }))}
    />
  );
}
