import { createClient } from "@/lib/supabase/server";
import type {
  CommunityCommentWithAuthor,
  CommunityPostDetail,
  CommunityPostWithAuthor,
  CommunityTag,
  ReactionSummary,
} from "@/types/database";

const FEED_PAGE_SIZE = 25;
const MAX_COMMENTS_PER_POST = 500;
const COMMUNITY_BUCKET = "community-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function signCommunityImageUrls(
  paths: string[]
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const unique = Array.from(new Set(paths));
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(COMMUNITY_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return new Map(unique.map((p) => [p, ""]));
  return new Map(unique.map((p, i) => [p, data[i]?.signedUrl ?? ""]));
}

type ReactionRow = {
  target_type: "post" | "comment";
  target_id: string;
  emoji: string;
  user_id: string;
};

function summarizeReactions(
  rows: ReactionRow[],
  currentUserId: string,
  filter: { target_type: "post" | "comment"; target_id: string }
): ReactionSummary[] {
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const r of rows) {
    if (r.target_type !== filter.target_type) continue;
    if (r.target_id !== filter.target_id) continue;
    const cur = counts.get(r.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (r.user_id === currentUserId) cur.mine = true;
    counts.set(r.emoji, cur);
  }
  return Array.from(counts.entries())
    .map(([emoji, { count, mine }]) => ({ emoji, count, mine }))
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}

async function batchSignUrlsForPaths(allPaths: string[]) {
  return signCommunityImageUrls(allPaths);
}

export async function getCommunityFeed(
  orgId: string,
  options: { tag?: CommunityTag | null; before?: string | null; limit?: number } = {}
): Promise<{ posts: CommunityPostWithAuthor[]; nextCursor: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { posts: [], nextCursor: null };

  const limit = Math.min(options.limit ?? FEED_PAGE_SIZE, FEED_PAGE_SIZE);

  let query = supabase
    .from("community_posts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options.tag) query = query.eq("tag", options.tag);
  if (options.before) query = query.lt("created_at", options.before);

  const { data: postsData, error } = await query;
  if (error) throw error;

  const posts = postsData ?? [];
  let nextCursor: string | null = null;
  let trimmedPosts = posts;
  if (posts.length > limit) {
    trimmedPosts = posts.slice(0, limit);
    nextCursor = trimmedPosts[trimmedPosts.length - 1].created_at;
  }

  if (trimmedPosts.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const postIds = trimmedPosts.map((p) => p.id);
  const userIds = Array.from(new Set(trimmedPosts.map((p) => p.user_id)));

  const [profilesRes, reactionsRes, commentCountsRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", userIds),
    supabase
      .from("community_reactions")
      .select("target_type, target_id, emoji, user_id")
      .eq("target_type", "post")
      .in("target_id", postIds),
    supabase
      .from("community_comments")
      .select("post_id")
      .in("post_id", postIds),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.display_name])
  );

  const reactionRows = (reactionsRes.data ?? []) as ReactionRow[];

  const commentCounts = new Map<string, number>();
  for (const row of commentCountsRes.data ?? []) {
    commentCounts.set(row.post_id, (commentCounts.get(row.post_id) ?? 0) + 1);
  }

  const allImagePaths = trimmedPosts.flatMap((p) => p.image_paths ?? []);
  const signedMap = await batchSignUrlsForPaths(allImagePaths);

  return {
    posts: trimmedPosts.map((p) => ({
      ...p,
      author: {
        id: p.user_id,
        display_name: profileMap.get(p.user_id) ?? "Unknown",
      },
      reactions: summarizeReactions(reactionRows, user.id, {
        target_type: "post",
        target_id: p.id,
      }),
      comment_count: commentCounts.get(p.id) ?? 0,
      signed_image_urls: (p.image_paths ?? []).map(
        (path: string) => signedMap.get(path) ?? ""
      ),
    })),
    nextCursor,
  };
}

export async function getCommunityPost(
  postId: string
): Promise<CommunityPostDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: post } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (!post) return null;

  const { data: comments, error: commentsErr } = await supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(MAX_COMMENTS_PER_POST);
  if (commentsErr) throw commentsErr;

  const allUserIds = Array.from(
    new Set([
      post.user_id,
      ...(comments ?? []).map((c) => c.user_id),
    ])
  );

  const commentIds = (comments ?? []).map((c) => c.id);

  const [profilesRes, postReactionsRes, commentReactionsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", allUserIds),
      supabase
        .from("community_reactions")
        .select("target_type, target_id, emoji, user_id")
        .eq("target_type", "post")
        .eq("target_id", postId),
      commentIds.length
        ? supabase
            .from("community_reactions")
            .select("target_type, target_id, emoji, user_id")
            .eq("target_type", "comment")
            .in("target_id", commentIds)
        : Promise.resolve({ data: [] as ReactionRow[], error: null }),
    ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.display_name])
  );
  const reactionRows: ReactionRow[] = [
    ...((postReactionsRes.data ?? []) as ReactionRow[]),
    ...((commentReactionsRes.data ?? []) as ReactionRow[]),
  ];

  const allImagePaths = [
    ...(post.image_paths ?? []),
    ...((comments ?? []).flatMap((c) => c.image_paths ?? [])),
  ];
  const signedMap = await batchSignUrlsForPaths(allImagePaths);

  const flatComments: CommunityCommentWithAuthor[] = (comments ?? []).map(
    (c) => ({
      ...c,
      author: {
        id: c.user_id,
        display_name: c.deleted_at
          ? ""
          : profileMap.get(c.user_id) ?? "Unknown",
      },
      reactions: summarizeReactions(reactionRows, user.id, {
        target_type: "comment",
        target_id: c.id,
      }),
      signed_image_urls: (c.image_paths ?? []).map(
        (path: string) => signedMap.get(path) ?? ""
      ),
      children: [],
    })
  );

  const commentMap = new Map(flatComments.map((c) => [c.id, c]));
  const roots: CommunityCommentWithAuthor[] = [];
  for (const c of flatComments) {
    if (c.parent_comment_id) {
      const parent = commentMap.get(c.parent_comment_id);
      if (parent) {
        parent.children.push(c);
        continue;
      }
    }
    roots.push(c);
  }

  return {
    ...post,
    author: {
      id: post.user_id,
      display_name: profileMap.get(post.user_id) ?? "Unknown",
    },
    reactions: summarizeReactions(reactionRows, user.id, {
      target_type: "post",
      target_id: postId,
    }),
    comment_count: flatComments.length,
    signed_image_urls: (post.image_paths ?? []).map(
      (path: string) => signedMap.get(path) ?? ""
    ),
    comments: roots,
  };
}

export function findCommentSubtree(
  comments: CommunityCommentWithAuthor[],
  rootCommentId: string
): CommunityCommentWithAuthor | null {
  for (const node of comments) {
    if (node.id === rootCommentId) return node;
    const child = findCommentSubtree(node.children, rootCommentId);
    if (child) return child;
  }
  return null;
}
