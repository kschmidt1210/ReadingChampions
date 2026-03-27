import { createClient } from "@/lib/supabase/server";
import {
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { getOrgMembers } from "@/lib/queries/admin";
import { PlayerManager } from "@/components/player-manager";

export default async function AdminPlayersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg || !user) return null;

  const members = await getOrgMembers(currentOrg.id);

  return (
    <PlayerManager
      orgId={currentOrg.id}
      initialMembers={members as any}
      currentUserId={user.id}
    />
  );
}
