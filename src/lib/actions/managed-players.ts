"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ManagedPlayerWithProfile } from "@/types/database";

async function requireAdmin(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" as const, supabase, user: null };

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Only admins can perform this action" as const, supabase, user: null };
  }

  return { error: null, supabase, user };
}

export async function linkManagedPlayer(
  orgId: string,
  parentUserId: string,
  childUserId: string
) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  if (parentUserId === childUserId) {
    return { error: "A player cannot be their own parent" };
  }

  const { data: members } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .in("user_id", [parentUserId, childUserId]);

  if (!members || members.length < 2) {
    return { error: "Both players must be members of this organization" };
  }

  const { data: circular } = await supabase
    .from("managed_players")
    .select("id")
    .eq("org_id", orgId)
    .eq("parent_user_id", childUserId)
    .eq("managed_user_id", parentUserId)
    .single();

  if (circular) {
    return { error: "Cannot create circular link — that child is already a parent of the selected parent" };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  const { error } = await admin
    .from("managed_players")
    .insert({
      parent_user_id: parentUserId,
      managed_user_id: childUserId,
      org_id: orgId,
    });

  if (error) {
    if (error.code === "23505") {
      return { error: "This player is already linked as a child of that parent" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/players");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function createManagedPlayer(orgId: string, displayName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Name cannot be empty" };

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "You are not a member of this organization" };

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  const placeholderEmail = `managed-${crypto.randomUUID()}@readingchampions.app`;
  const placeholderPassword = crypto.randomUUID();

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: placeholderEmail,
    password: placeholderPassword,
    email_confirm: true,
    user_metadata: { display_name: trimmed },
  });

  if (createError || !newUser?.user) {
    return { error: createError?.message ?? "Failed to create managed player" };
  }

  const childUserId = newUser.user.id;

  const { error: memberError } = await admin
    .from("org_members")
    .insert({
      org_id: orgId,
      user_id: childUserId,
      role: "player",
    });

  if (memberError) return { error: memberError.message };

  const { error: linkError } = await admin
    .from("managed_players")
    .insert({
      parent_user_id: user.id,
      managed_user_id: childUserId,
      org_id: orgId,
    });

  if (linkError) return { error: linkError.message };

  revalidatePath("/", "layout");
  return { success: true, userId: childUserId };
}

export async function getManagedPlayers(orgId: string): Promise<ManagedPlayerWithProfile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: links } = await supabase
    .from("managed_players")
    .select("id, parent_user_id, managed_user_id, org_id, created_at")
    .eq("org_id", orgId)
    .eq("parent_user_id", user.id);

  if (!links || links.length === 0) return [];

  const managedUserIds = links.map((l) => l.managed_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", managedUserIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name])
  );

  return links.map((row) => ({
    id: row.id,
    parent_user_id: row.parent_user_id,
    managed_user_id: row.managed_user_id,
    org_id: row.org_id,
    created_at: row.created_at,
    display_name: profileMap.get(row.managed_user_id) ?? "Unknown",
  }));
}

export async function getManagedPlayersForOrg(orgId: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return [];

  const { data } = await supabase
    .from("managed_players")
    .select("id, parent_user_id, managed_user_id, org_id, created_at")
    .eq("org_id", orgId);

  return data ?? [];
}

export async function unlinkManagedPlayer(orgId: string, managedUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: link } = await supabase
    .from("managed_players")
    .select("id, parent_user_id")
    .eq("org_id", orgId)
    .eq("managed_user_id", managedUserId)
    .single();

  if (!link) return { error: "Managed player link not found" };

  const isParent = link.parent_user_id === user.id;

  if (!isParent) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { error: "Only the parent or an admin can unlink a managed player" };
    }
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  const { error } = await admin
    .from("managed_players")
    .delete()
    .eq("id", link.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/players");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function promoteManagedPlayer(
  orgId: string,
  managedUserId: string,
  email: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: link } = await supabase
    .from("managed_players")
    .select("id, parent_user_id")
    .eq("org_id", orgId)
    .eq("managed_user_id", managedUserId)
    .single();

  if (!link) return { error: "Managed player link not found" };

  const isParent = link.parent_user_id === user.id;

  if (!isParent) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return { error: "Only the parent or an admin can promote a managed player" };
    }
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { error: "Please enter a valid email address" };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  const { error } = await admin.auth.admin.updateUserById(managedUserId, {
    email: trimmed,
    email_confirm: true,
  });

  if (error) {
    if (error.message?.toLowerCase().includes("already been registered") ||
        error.message?.toLowerCase().includes("already exists") ||
        error.status === 422) {
      return { error: "That email is already used by another account" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/players");
  revalidatePath("/", "layout");
  return { success: true, email: trimmed };
}
