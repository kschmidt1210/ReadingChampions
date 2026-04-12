"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getActiveSeason, getOrgGenres } from "@/lib/queries/organizations";

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

  const { data: inviteCode } = await supabase.rpc("generate_invite_code");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, invite_code: inviteCode })
    .select()
    .single();

  if (orgError) return { error: orgError.message };

  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) return { error: memberError.message };

  const currentYear = new Date().getFullYear();
  const { error: seasonError } = await supabase.from("seasons").insert({
    org_id: org.id,
    name: `${currentYear} Championship`,
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
  });

  if (seasonError) return { error: seasonError.message };

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
  if (!inviteCode || typeof inviteCode !== "string") {
    return { error: "Invite code is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();

  if (orgError || !org) return { error: "Invalid invite code" };

  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    redirect("/leaderboard");
  }

  const { error: joinError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "player",
  });

  if (joinError) return { error: joinError.message };

  revalidatePath("/", "layout");
  redirect("/leaderboard");
}

export async function switchOrg(orgId: string) {
  const { getManagedPlayers } = await import("@/lib/actions/managed-players");

  const cookieStore = await cookies();
  cookieStore.set("currentOrgId", orgId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const [season, genres, managedPlayersList] = await Promise.all([
    getActiveSeason(orgId),
    getOrgGenres(orgId),
    getManagedPlayers(orgId),
  ]);

  revalidatePath("/", "layout");

  return {
    seasonId: season?.id ?? null,
    genres: genres.map((g) => ({ id: g.id, name: g.name })),
    managedPlayers: managedPlayersList.map((mp) => ({
      userId: mp.managed_user_id,
      displayName: mp.display_name,
    })),
  };
}

export async function renameOrganization(orgId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Only admins can rename the organization" };
  }

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name cannot be empty" };

  const { error } = await supabase
    .from("organizations")
    .update({ name: trimmed })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { name: trimmed };
}

export async function regenerateInviteCode(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

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
