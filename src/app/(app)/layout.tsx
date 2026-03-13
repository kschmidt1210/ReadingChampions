import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUserOrganizations,
  getActiveSeason,
  getOrgGenres,
} from "@/lib/queries/organizations";
import { OrgProvider } from "@/components/providers";
import { AppShell } from "./app-shell";

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

  const initialOrgId = orgs[0]?.id ?? null;

  // Fetch season and genres for the initial org
  const season = initialOrgId ? await getActiveSeason(initialOrgId) : null;
  const genres = initialOrgId ? await getOrgGenres(initialOrgId) : [];

  return (
    <OrgProvider
      orgs={orgs}
      initialOrgId={initialOrgId}
      seasonId={season?.id ?? null}
      genres={genres.map((g) => ({ id: g.id, name: g.name }))}
    >
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
