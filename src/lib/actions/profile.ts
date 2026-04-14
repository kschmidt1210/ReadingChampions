"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ViewMode, ThemePreference } from "@/types/database";

const MAX_ABOUT_LENGTH = 500;

const ALLOWED_HOSTS: Record<string, string[]> = {
  goodreads_url: ["www.goodreads.com", "goodreads.com"],
  storygraph_url: [
    "www.thestorygraph.com",
    "thestorygraph.com",
    "app.thestorygraph.com",
  ],
};

function validateProfileUrl(
  field: "goodreads_url" | "storygraph_url",
  raw: string | null
): { value: string | null; error?: string } {
  if (!raw || !raw.trim()) return { value: null };

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { value: null, error: `Invalid URL for ${field}` };
  }

  if (url.protocol !== "https:") {
    return { value: null, error: "Only https links are allowed" };
  }

  const allowed = ALLOWED_HOSTS[field];
  if (!allowed.includes(url.hostname)) {
    return {
      value: null,
      error: `URL must be on ${allowed.join(" or ")}`,
    };
  }

  return { value: url.toString() };
}

export async function updateMyProfile(data: {
  display_name: string;
  about_text: string | null;
  goodreads_url: string | null;
  storygraph_url: string | null;
  default_view: ViewMode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = data.display_name.trim();
  if (!name) return { error: "Name cannot be empty" };

  const about =
    data.about_text?.trim().slice(0, MAX_ABOUT_LENGTH) || null;

  const gr = validateProfileUrl("goodreads_url", data.goodreads_url);
  if (gr.error) return { error: gr.error };

  const sg = validateProfileUrl("storygraph_url", data.storygraph_url);
  if (sg.error) return { error: sg.error };

  const view = data.default_view === "detail" ? "detail" : "default";

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: name,
      about_text: about,
      goodreads_url: gr.value,
      storygraph_url: sg.value,
      default_view: view,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/my-books");
  revalidatePath("/settings");
  revalidatePath("/leaderboard");
  revalidatePath(`/player/${user.id}`);
  return { success: true };
}

const VALID_VIEW_MODES: ViewMode[] = ["default", "detail"];

export async function updateDefaultView(view: ViewMode) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!VALID_VIEW_MODES.includes(view)) {
    return { error: "Invalid view mode" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ default_view: view })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

const VALID_THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export async function updateThemePreference(theme: ThemePreference) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!VALID_THEME_PREFERENCES.includes(theme)) {
    return { error: "Invalid theme preference" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: theme })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Not authenticated" };

  if (data.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: data.currentPassword,
  });
  if (verifyError) return { error: "Current password is incorrect" };

  const { error } = await supabase.auth.updateUser({
    password: data.newPassword,
  });
  if (error) return { error: error.message };

  return { success: true };
}
