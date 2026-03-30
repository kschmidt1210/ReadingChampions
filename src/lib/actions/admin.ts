"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Role, ScoringRulesConfig } from "@/types/database";
import { calculateBookScore } from "@/lib/scoring";

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

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: Role
) {
  const { error: authError, supabase, user } = await requireAdmin(orgId);
  if (authError || !user) return { error: authError ?? "Not authenticated" };

  const { data: target } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single();

  if (!target) return { error: "Member not found" };

  if (target.role === "admin" && newRole === "player") {
    const { count } = await supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      return { error: "Cannot demote the last admin" };
    }
  }

  const { error } = await supabase
    .from("org_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/admin/players");
}

export async function removeMember(orgId: string, memberId: string) {
  const { error: authError, supabase, user } = await requireAdmin(orgId);
  if (authError || !user) return { error: authError ?? "Not authenticated" };

  const { data: target } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single();

  if (!target) return { error: "Member not found" };

  if (target.user_id === user.id) {
    return { error: "You cannot remove yourself" };
  }

  if (target.role === "admin") {
    const { count } = await supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      return { error: "Cannot remove the last admin" };
    }
  }

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("id", memberId)
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/admin/players");
}

export async function addGenre(orgId: string, name: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { data: maxOrder } = await supabase
    .from("genres")
    .select("sort_order")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("genres")
    .insert({ org_id: orgId, name, sort_order: nextOrder });

  if (error) return { error: error.message };
  revalidatePath("/admin/genres");
}

export async function reorderGenres(orgId: string, genreIds: string[]) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  for (let i = 0; i < genreIds.length; i++) {
    const { error } = await supabase
      .from("genres")
      .update({ sort_order: i })
      .eq("id", genreIds[i])
      .eq("org_id", orgId);

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/genres");
}

export async function removeGenre(orgId: string, genreId: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("genres")
    .delete()
    .eq("id", genreId)
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/admin/genres");
}

export async function updateScoringRules(orgId: string, rulesId: string, config: Record<string, unknown>) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("scoring_rules")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", rulesId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function resolveFlaggedEntry(orgId: string, flagId: string) {
  const { error: authError, supabase, user } = await requireAdmin(orgId);
  if (authError || !user) return { error: authError ?? "Not authenticated" };

  const { error } = await supabase
    .from("flagged_entries")
    .update({ resolved: true, resolved_by: user.id })
    .eq("id", flagId);

  if (error) return { error: error.message };
  revalidatePath("/admin/flagged");
}

export async function recalculateSeasonPoints(orgId: string, seasonId: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { data: rules } = await supabase
    .from("scoring_rules")
    .select("config")
    .eq("org_id", orgId)
    .single();

  let config: ScoringRulesConfig;
  if (rules) {
    config = rules.config as ScoringRulesConfig;
  } else {
    const { data: globalRules } = await supabase
      .from("scoring_rules")
      .select("config")
      .is("org_id", null)
      .single();
    if (!globalRules) return { error: "No scoring rules found" };
    config = globalRules.config as ScoringRulesConfig;
  }

  const { data: entries } = await supabase
    .from("book_entries")
    .select("*, book:books(country)")
    .eq("season_id", seasonId);

  if (!entries || entries.length === 0) return { updated: 0 };

  const entriesByUser = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = entriesByUser.get(entry.user_id) ?? [];
    list.push(entry);
    entriesByUser.set(entry.user_id, list);
  }

  let updated = 0;
  for (const [userId, userEntries] of entriesByUser) {
    const sortedEntries = userEntries.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const seenCountries = new Set<string>();
    for (const entry of sortedEntries) {
      const country = (entry.book as any)?.country;
      const isNewCountry = !!country && !seenCountries.has(country);
      if (country) seenCountries.add(country);

      const score = calculateBookScore(
        {
          pages: (entry.book as any)?.pages ?? 0,
          fiction: entry.fiction,
          bonus_1: entry.bonus_1,
          bonus_2: entry.bonus_2,
          bonus_3: entry.bonus_3,
          hometown_bonus: entry.hometown_bonus,
          deduction: entry.deduction,
          isNewCountry,
        },
        config
      );

      if (Math.abs(score.finalScore - Number(entry.points)) > 0.01) {
        await supabase
          .from("book_entries")
          .update({ points: score.finalScore, updated_at: new Date().toISOString() })
          .eq("id", entry.id);
        updated++;
      }
    }
  }

  revalidatePath("/", "layout");
  return { updated };
}

export async function deleteOrganization(orgId: string) {
  const { error: authError, supabase, user } = await requireAdmin(orgId);
  if (authError || !user) return { error: authError ?? "Not authenticated" };

  // Delete in dependency order: flagged_entries → book_entries → books (orphaned handled by app) → genres → seasons → scoring_rules → org_members → organizations
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id")
    .eq("org_id", orgId);

  if (seasons) {
    for (const season of seasons) {
      const { data: entries } = await supabase
        .from("book_entries")
        .select("id")
        .eq("season_id", season.id);

      if (entries) {
        for (const entry of entries) {
          await supabase
            .from("flagged_entries")
            .delete()
            .eq("book_entry_id", entry.id);
        }
      }

      await supabase
        .from("book_entries")
        .delete()
        .eq("season_id", season.id);
    }
  }

  await supabase.from("genres").delete().eq("org_id", orgId);
  await supabase.from("seasons").delete().eq("org_id", orgId);
  await supabase.from("scoring_rules").delete().eq("org_id", orgId);
  await supabase.from("org_members").delete().eq("org_id", orgId);

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { deleted: true };
}

export async function archiveSeason(orgId: string, seasonId: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("seasons")
    .update({
      status: "archived",
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", seasonId)
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function createNewSeason(orgId: string, name: string) {
  const { error: authError, supabase } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  await supabase
    .from("seasons")
    .update({
      status: "archived",
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("org_id", orgId)
    .eq("status", "active");

  const { error } = await supabase.from("seasons").insert({
    org_id: orgId,
    name,
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
  });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function updatePlayerName(
  orgId: string,
  userId: string,
  newName: string
) {
  const { error: authError } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const trimmed = newName.trim();
  if (!trimmed) {
    return { error: "Name cannot be empty" };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  const { error } = await admin
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/players");
  return { name: trimmed };
}

export async function updatePlayerEmail(
  orgId: string,
  userId: string,
  newEmail: string
) {
  const { error: authError } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const trimmed = newEmail.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { error: "Please enter a valid email address" };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  const { data: usersData } = await admin.auth.admin.listUsers();
  const conflict = usersData?.users?.find(
    (u) => u.email === trimmed && u.id !== userId
  );
  if (conflict) {
    return { error: "That email is already used by another account" };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    email: trimmed,
    email_confirm: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/players");
  return { email: trimmed };
}

export async function generatePlayerInvite(orgId: string, userId: string) {
  const { error: authError } = await requireAdmin(orgId);
  if (authError) return { error: authError };

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured" };

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user?.email) {
    return { error: "Could not find user" };
  }

  const email = userData.user.email;
  if (email.endsWith("@readingchampions.app")) {
    return {
      error: "Assign a real email address before generating an invite link",
    };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error) return { error: error.message };

  return { link: data.properties.action_link };
}
