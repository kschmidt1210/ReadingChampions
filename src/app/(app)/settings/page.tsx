import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, about_text, goodreads_url, storygraph_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
      <SettingsForm
        email={user.email ?? ""}
        profile={{
          display_name: profile?.display_name ?? "",
          about_text: profile?.about_text ?? "",
          goodreads_url: profile?.goodreads_url ?? "",
          storygraph_url: profile?.storygraph_url ?? "",
        }}
      />
    </div>
  );
}
