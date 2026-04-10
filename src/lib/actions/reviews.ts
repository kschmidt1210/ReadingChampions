"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ReviewVisibility } from "@/types/database";

export async function createOrUpdateReview(
  bookEntryId: string,
  reviewText: string,
  visibility: ReviewVisibility
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: entry } = await supabase
    .from("book_entries")
    .select("user_id")
    .eq("id", bookEntryId)
    .single();

  if (!entry) throw new Error("Book entry not found");
  if (entry.user_id !== user.id) throw new Error("Not authorized");

  const trimmed = reviewText.trim();
  if (!trimmed) throw new Error("Review text cannot be empty");
  if (trimmed.length > 5000) throw new Error("Review text too long (max 5000 characters)");

  const { data: existing } = await supabase
    .from("book_reviews")
    .select("id")
    .eq("book_entry_id", bookEntryId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("book_reviews")
      .update({
        review_text: trimmed,
        visibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("book_reviews")
      .insert({
        book_entry_id: bookEntryId,
        user_id: user.id,
        review_text: trimmed,
        visibility,
      });

    if (error) throw error;
  }

  revalidatePath("/", "layout");
}

export async function deleteReview(reviewId: string, orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: review } = await supabase
    .from("book_reviews")
    .select("user_id")
    .eq("id", reviewId)
    .single();

  if (!review) throw new Error("Review not found");

  const isOwner = review.user_id === user.id;

  if (!isOwner) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized to delete this review");
    }
  }

  const client = isOwner ? supabase : createAdminClient();
  if (!client) throw new Error("Admin client not configured");

  const { error } = await client
    .from("book_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function adminSetReviewPrivate(reviewId: string, orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    throw new Error("Not authorized");
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin client not configured");

  const { error } = await adminClient
    .from("book_reviews")
    .update({
      visibility: "private",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (error) throw error;

  revalidatePath("/", "layout");
}
