import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserOrganizations } from "@/lib/queries/organizations";
import Link from "next/link";

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
  const currentOrg = orgs[0];

  if (!currentOrg || currentOrg.role !== "admin") {
    redirect("/leaderboard");
  }

  const tabs = [
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/players", label: "Players" },
    { href: "/admin/genres", label: "Genres" },
    { href: "/admin/scoring", label: "Scoring" },
    { href: "/admin/flagged", label: "Flagged" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Admin</h1>
      <div className="flex gap-1 mb-6 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap border-b-2 border-transparent hover:border-gray-300"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
