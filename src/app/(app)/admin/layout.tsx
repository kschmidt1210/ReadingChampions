import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getUserOrganizations,
  getCurrentOrg,
} from "@/lib/queries/organizations";
import { AdminTabs } from "@/components/admin-tabs";

export default async function AdminLayout({
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
  const currentOrg = await getCurrentOrg(orgs);

  if (!currentOrg || currentOrg.role !== "admin") {
    redirect("/leaderboard");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Admin</h1>
      <AdminTabs />
      {children}
    </div>
  );
}
