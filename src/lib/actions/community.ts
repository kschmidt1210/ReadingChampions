"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CommunityTag, CommunityReactionTarget } from "@/types/database";

const VALID_TAGS: CommunityTag[] = [
  "recommendation",
  "rules",
  "leaderboard",
  "milestone",
  "general",
];

const POST_BODY_MAX = 4000;
const COMMENT_BODY_MAX = 2000;
const MAX_IMAGES_PER_POST = 4;
const MAX_IMAGES_PER_COMMENT = 2;
const COMMUNITY_BUCKET = "community-images";

const COMMUNITY_PATH_REGEX =
  /^[0-9a-f-]{36}\/(posts|comments)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/i;

function normalizeTag(tag: string | null | undefined): CommunityTag | null {
  if (!tag) return null;
  return VALID_TAGS.includes(tag as CommunityTag)
    ? (tag as CommunityTag)
    : null;
}

function validateImagePaths(paths: string[], orgId: string, max: number) {
  if (!Array.isArray(paths)) return [];
  const cleaned = paths
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .slice(0, max);
  for (const p of cleaned) {
    if (!COMMUNITY_PATH_REGEX.test(p)) {
      throw new Error(`Invalid image path: ${p}`);
    }
    if (!p.startsWith(`${orgId}/`)) {
      throw new Error("Image path must belong to the same organization");
    }
  }
  return cleaned;
}

async function requireMembership(orgId: string) {
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

  if (!membership) {
    throw new Error("You are not a member of this organization");
  }

  return { supabase, user, role: membership.role as string };
}

async function isOrgAdmin(orgId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();
  return data?.role === "admin";
}

export async function createCommunityPost(input: {
  orgId: string;
  postId: string;
  body: string;
  tag?: CommunityTag | null;
  imagePaths?: string[];
}) {
  const { supabase, user } = await requireMembership(input.orgId);

  const trimmed = input.body.trim();
  if (!trimmed && (input.imagePaths ?? []).length === 0) {
    throw new Error("Post must have text or at least one image");
  }
  if (trimmed.length > POST_BODY_MAX) {
    throw new Error(`Post body too long (max ${POST_BODY_MAX} characters)`);
  }

  const imagePaths = validateImagePaths(
    input.imagePaths ?? [],
    input.orgId,
    MAX_IMAGES_PER_POST
  );

  if (!/^[0-9a-f-]{36}$/i.test(input.postId)) {
    throw new Error("Invalid post id");
  }

  const { error } = await supabase.from("community_posts").insert({
    id: input.postId,
    org_id: input.orgId,
    user_id: user.id,
    body: trimmed,
    tag: normalizeTag(input.tag ?? null),
    image_paths: imagePaths,
  });

  if (error) throw error;

  revalidatePath("/community");
  return { id: input.postId };
}

export async function updateCommunityPost(input: {
  postId: string;
  body: string;
  tag?: CommunityTag | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("community_posts")
    .select("id, user_id, org_id, image_paths")
    .eq("id", input.postId)
    .single();

  if (!existing) throw new Error("Post not found");
  if (existing.user_id !== user.id) {
    throw new Error("Only the author can edit this post");
  }

  const trimmed = input.body.trim();
  const hasImages = (existing.image_paths ?? []).length > 0;
  if (!trimmed && !hasImages) {
    throw new Error("Post must have text or at least one image");
  }
  if (trimmed.length > POST_BODY_MAX) {
    throw new Error(`Post body too long (max ${POST_BODY_MAX} characters)`);
  }

  const { error } = await supabase
    .from("community_posts")
    .update({
      body: trimmed,
      tag: normalizeTag(input.tag ?? null),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.postId);

  if (error) throw error;

  revalidatePath("/community");
  revalidatePath(`/community/${input.postId}`);
}

async function deleteStorageFolder(folder: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: files } = await admin.storage
    .from(COMMUNITY_BUCKET)
    .list(folder, { limit: 100 });
  if (!files || files.length === 0) return;
  const paths = files.map((f) => `${folder}/${f.name}`);
  await admin.storage.from(COMMUNITY_BUCKET).remove(paths);
}

export async function deleteCommunityPost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("community_posts")
    .select("id, user_id, org_id")
    .eq("id", postId)
    .single();

  if (!existing) throw new Error("Post not found");

  const isAuthor = existing.user_id === user.id;
  const isAdmin = !isAuthor && (await isOrgAdmin(existing.org_id, user.id));
  if (!isAuthor && !isAdmin) {
    throw new Error("Not authorized to delete this post");
  }

  const writeClient = isAdmin ? createAdminClient() ?? supabase : supabase;

  await deleteReactionsFor("post", postId, writeClient);

  const { data: comments } = await supabase
    .from("community_comments")
    .select("id")
    .eq("post_id", postId);
  if (comments?.length) {
    for (const c of comments) {
      await deleteReactionsFor("comment", c.id, writeClient);
    }
  }

  const { error } = await writeClient
    .from("community_posts")
    .delete()
    .eq("id", postId);
  if (error) throw error;

  await deleteStorageFolder(`${existing.org_id}/posts/${postId}`);
  if (comments?.length) {
    for (const c of comments) {
      await deleteStorageFolder(`${existing.org_id}/comments/${c.id}`);
    }
  }

  revalidatePath("/community");
}

export async function createCommunityComment(input: {
  postId: string;
  commentId: string;
  body: string;
  parentCommentId?: string | null;
  imagePaths?: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, org_id")
    .eq("id", input.postId)
    .single();
  if (!post) throw new Error("Post not found");

  await requireMembership(post.org_id);

  const trimmed = input.body.trim();
  if (!trimmed && (input.imagePaths ?? []).length === 0) {
    throw new Error("Comment must have text or at least one image");
  }
  if (trimmed.length > COMMENT_BODY_MAX) {
    throw new Error(
      `Comment body too long (max ${COMMENT_BODY_MAX} characters)`
    );
  }

  if (!/^[0-9a-f-]{36}$/i.test(input.commentId)) {
    throw new Error("Invalid comment id");
  }

  if (input.parentCommentId) {
    const { data: parent } = await supabase
      .from("community_comments")
      .select("id, post_id")
      .eq("id", input.parentCommentId)
      .single();
    if (!parent || parent.post_id !== input.postId) {
      throw new Error("Parent comment does not belong to this post");
    }
  }

  const imagePaths = validateImagePaths(
    input.imagePaths ?? [],
    post.org_id,
    MAX_IMAGES_PER_COMMENT
  );

  const { error } = await supabase.from("community_comments").insert({
    id: input.commentId,
    post_id: input.postId,
    parent_comment_id: input.parentCommentId ?? null,
    user_id: user.id,
    body: trimmed,
    image_paths: imagePaths,
  });

  if (error) throw error;

  revalidatePath("/community");
  revalidatePath(`/community/${input.postId}`);
  return { id: input.commentId };
}

export async function updateCommunityComment(input: {
  commentId: string;
  body: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("community_comments")
    .select("id, user_id, post_id, deleted_at, image_paths")
    .eq("id", input.commentId)
    .single();

  if (!existing) throw new Error("Comment not found");
  if (existing.deleted_at) throw new Error("Comment was deleted");
  if (existing.user_id !== user.id) {
    throw new Error("Only the author can edit this comment");
  }

  const trimmed = input.body.trim();
  const hasImages = (existing.image_paths ?? []).length > 0;
  if (!trimmed && !hasImages) {
    throw new Error("Comment must have text or at least one image");
  }
  if (trimmed.length > COMMENT_BODY_MAX) {
    throw new Error(
      `Comment body too long (max ${COMMENT_BODY_MAX} characters)`
    );
  }

  const { error } = await supabase
    .from("community_comments")
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq("id", input.commentId);

  if (error) throw error;

  revalidatePath(`/community/${existing.post_id}`);
}

async function deleteReactionsFor(
  targetType: CommunityReactionTarget,
  targetId: string,
  client: Awaited<ReturnType<typeof createClient>> | NonNullable<ReturnType<typeof createAdminClient>>
) {
  await client
    .from("community_reactions")
    .delete()
    .eq("target_type", targetType)
    .eq("target_id", targetId);
}

export async function deleteCommunityComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("community_comments")
    .select("id, user_id, post_id, image_paths")
    .eq("id", commentId)
    .single();
  if (!existing) throw new Error("Comment not found");

  const { data: post } = await supabase
    .from("community_posts")
    .select("org_id")
    .eq("id", existing.post_id)
    .single();
  const orgId = post?.org_id ?? null;

  const isAuthor = existing.user_id === user.id;
  const isAdmin = !isAuthor && orgId
    ? await isOrgAdmin(orgId, user.id)
    : false;
  if (!isAuthor && !isAdmin) {
    throw new Error("Not authorized to delete this comment");
  }

  const writeClient = isAdmin ? createAdminClient() ?? supabase : supabase;

  const { count: childCount } = await supabase
    .from("community_comments")
    .select("*", { count: "exact", head: true })
    .eq("parent_comment_id", commentId);

  await deleteReactionsFor("comment", commentId, writeClient);

  if (orgId && existing.image_paths?.length) {
    await deleteStorageFolder(`${orgId}/comments/${commentId}`);
  }

  if ((childCount ?? 0) > 0) {
    const { error } = await writeClient
      .from("community_comments")
      .update({
        body: "",
        image_paths: [],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);
    if (error) throw error;
  } else {
    const { error } = await writeClient
      .from("community_comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
  }

  revalidatePath(`/community/${existing.post_id}`);
  revalidatePath("/community");
}

export async function toggleCommunityReaction(input: {
  targetType: CommunityReactionTarget;
  targetId: string;
  emoji: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const emoji = input.emoji.trim();
  if (!emoji || emoji.length > 16) {
    throw new Error("Invalid emoji");
  }

  let postIdForRevalidate: string | null = null;
  if (input.targetType === "post") {
    postIdForRevalidate = input.targetId;
  } else {
    const { data: c } = await supabase
      .from("community_comments")
      .select("post_id")
      .eq("id", input.targetId)
      .single();
    postIdForRevalidate = c?.post_id ?? null;
  }

  const { data: existing } = await supabase
    .from("community_reactions")
    .select("id")
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    if (postIdForRevalidate) {
      revalidatePath(`/community/${postIdForRevalidate}`);
    }
    revalidatePath("/community");
    return { added: false };
  }

  const { error } = await supabase.from("community_reactions").insert({
    target_type: input.targetType,
    target_id: input.targetId,
    user_id: user.id,
    emoji,
  });
  if (error) throw error;

  if (postIdForRevalidate) {
    revalidatePath(`/community/${postIdForRevalidate}`);
  }
  revalidatePath("/community");
  return { added: true };
}

export async function uploadCommunityImage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file");
  const orgId = formData.get("orgId");
  const targetType = formData.get("targetType");
  const targetId = formData.get("targetId");

  if (!(file instanceof File)) throw new Error("Missing file");
  if (typeof orgId !== "string") throw new Error("Missing orgId");
  if (targetType !== "post" && targetType !== "comment") {
    throw new Error("Invalid targetType");
  }
  if (typeof targetId !== "string" || !/^[0-9a-f-]{36}$/i.test(targetId)) {
    throw new Error("Invalid targetId");
  }

  await requireMembership(orgId);

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image too large (max 8 MB)");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : file.type.split("/")[1] ?? "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "img";
  const filename = `${crypto.randomUUID()}.${safeExt}`;
  const folderPiece = targetType === "post" ? "posts" : "comments";
  const path = `${orgId}/${folderPiece}/${targetId}/${filename}`;

  const { error } = await supabase.storage
    .from(COMMUNITY_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  return { path };
}

export async function loadMoreCommunityPosts(input: {
  orgId: string;
  tag: CommunityTag | null;
  before: string;
}) {
  const { getCommunityFeed } = await import("@/lib/queries/community");
  await requireMembership(input.orgId);
  return getCommunityFeed(input.orgId, {
    tag: input.tag,
    before: input.before,
  });
}
