import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUserOrganizations,
  getCurrentOrg,
  getActiveSeason,
  getOrgGenres,
} from "@/lib/queries/organizations";
import { getManagedPlayers } from "@/lib/actions/managed-players";
import { OrgProvider } from "@/components/providers";
import { ViewModeProvider } from "@/components/view-mode-provider";
import { ThemeSync } from "@/components/theme-sync";
import { AppShell } from "./app-shell";
import type { ViewMode, ThemePreference } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgs = await getUserOrganizations();

  if (orgs.length === 0) {
    redirect("/welcome");
  }

  const currentOrg = await getCurrentOrg(orgs);
  const initialOrgId = currentOrg?.id ?? null;

  const [season, genres, profileResult, managedPlayersList] = await Promise.all([
    initialOrgId ? getActiveSeason(initialOrgId) : null,
    initialOrgId ? getOrgGenres(initialOrgId) : [],
    supabase
      .from("profiles")
      .select("default_view, theme_preference")
      .eq("id", user.id)
      .single(),
    initialOrgId ? getManagedPlayers(initialOrgId) : [],
  ]);

  const defaultView: ViewMode =
    profileResult.data?.default_view === "detail" ? "detail" : "default";

  const themePreference: ThemePreference =
    (profileResult.data?.theme_preference as ThemePreference) ?? "system";

  return (
    <OrgProvider
      orgs={orgs}
      initialOrgId={initialOrgId}
      seasonId={season?.id ?? null}
      genres={genres.map((g) => ({ id: g.id, name: g.name }))}
      managedPlayers={managedPlayersList.map((mp) => ({
        userId: mp.managed_user_id,
        displayName: mp.display_name,
      }))}
    >
      <ViewModeProvider initialMode={defaultView}>
        <ThemeSync preference={themePreference} />
        <AppShell>{children}</AppShell>
      </ViewModeProvider>
    </OrgProvider>
  );
}
