import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserOrganizations, getCurrentOrg } from "@/lib/queries/organizations";
import { getManagedPlayers } from "@/lib/actions/managed-players";
import { SettingsForm } from "@/components/settings-form";
import { ManagedPlayersSettings } from "@/components/managed-players-settings";
import type { ViewMode } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, orgs] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, about_text, goodreads_url, storygraph_url, default_view")
      .eq("id", user.id)
      .single(),
    getUserOrganizations(),
  ]);

  const currentOrg = await getCurrentOrg(orgs);
  const managedPlayersList = currentOrg
    ? await getManagedPlayers(currentOrg.id)
    : [];

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "";

  const defaultView: ViewMode =
    profile?.default_view === "detail" ? "detail" : "default";

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
      <SettingsForm
        email={user.email ?? ""}
        profile={{
          display_name: displayName,
          about_text: profile?.about_text ?? "",
          goodreads_url: profile?.goodreads_url ?? "",
          storygraph_url: profile?.storygraph_url ?? "",
          default_view: defaultView,
        }}
      />
      {currentOrg && (
        <>
          <hr className="border-gray-200" />
          <ManagedPlayersSettings
            orgId={currentOrg.id}
            managedPlayers={managedPlayersList.map((mp) => ({
              managedUserId: mp.managed_user_id,
              displayName: mp.display_name,
            }))}
          />
        </>
      )}
    </div>
  );
}
