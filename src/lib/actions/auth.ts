"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  const redirectTo = formData.get("redirectTo") as string | null;
  const destination = redirectTo?.startsWith("/") ? redirectTo : "/leaderboard";

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const displayName = formData.get("displayName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rawRedirect = (formData.get("redirectTo") as string) || "/leaderboard";
  const redirectTo = rawRedirect.startsWith("/") ? rawRedirect : "/leaderboard";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && !data.session) {
    return { success: "Check your email to confirm your account before signing in." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const headerStore = await headers();
  const origin =
    headerStore.get("x-forwarded-proto") && headerStore.get("host")
      ? `${headerStore.get("x-forwarded-proto")}://${headerStore.get("host")}`
      : headerStore.get("origin") ?? "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired — please request a new reset link." };

  const password = formData.get("password") as string;
  const confirm = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/leaderboard");
}
