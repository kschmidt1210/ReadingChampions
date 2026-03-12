"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const DEFAULT_GENRES = [
  "Mystery/Thriller",
  "Afrofuturism",
  "Fantasy",
  "Romance",
  "Folklore/Mythology",
  "Historical Fiction",
  "Memoir",
  "Weird Fiction",
];

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;

  // Generate unique invite code
  const { data: inviteCode } = await supabase.rpc("generate_invite_code");

  // Create org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, invite_code: inviteCode })
    .select()
    .single();

  if (orgError) return { error: orgError.message };

  // Add creator as admin
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) return { error: memberError.message };

  // Create first season
  const currentYear = new Date().getFullYear();
  const { error: seasonError } = await supabase.from("seasons").insert({
    org_id: org.id,
    name: `${currentYear} Championship`,
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
  });

  if (seasonError) return { error: seasonError.message };

  // Seed default genres
  const genreRows = DEFAULT_GENRES.map((name, i) => ({
    org_id: org.id,
    name,
    sort_order: i,
  }));

  const { error: genreError } = await supabase
    .from("genres")
    .insert(genreRows);

  if (genreError) return { error: genreError.message };

  revalidatePath("/", "layout");
  redirect("/leaderboard");
}

export async function joinOrganization(inviteCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Look up org by invite code
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();

  if (orgError || !org) return { error: "Invalid invite code" };

  // Check if already a member
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    redirect("/leaderboard");
  }

  // Join as player
  const { error: joinError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "player",
  });

  if (joinError) return { error: joinError.message };

  revalidatePath("/", "layout");
  redirect("/leaderboard");
}

export async function regenerateInviteCode(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify caller is an admin of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Only admins can regenerate invite codes" };
  }

  const { data: newCode } = await supabase.rpc("generate_invite_code");

  const { error } = await supabase
    .from("organizations")
    .update({ invite_code: newCode })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { invite_code: newCode };
}
