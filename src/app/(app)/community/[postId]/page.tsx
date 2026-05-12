import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentOrg,
  getUserOrganizations,
} from "@/lib/queries/organizations";
import {
  getCommunityPost,
  findCommentSubtree,
} from "@/lib/queries/community";
import { CommunityPostCard } from "@/components/community-post-card";
import { CommunityComposer } from "@/components/community-composer";
import { CommunityCommentThread } from "@/components/community-comment-thread";
import type { CommunityCommentWithAuthor } from "@/types/database";

export default async function CommunityPostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { postId } = await params;
  const { focus } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgs = await getUserOrganizations();
  const currentOrg = await getCurrentOrg(orgs);
  if (!currentOrg) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-muted-foreground">
          Join a competition to view this post.
        </p>
      </div>
    );
  }

  const detail = await getCommunityPost(postId);
  if (!detail) notFound();
  if (detail.org_id !== currentOrg.id) notFound();

  const isAdmin = currentOrg.role === "admin";

  let commentRoots: CommunityCommentWithAuthor[] = detail.comments;
  let focusedComment: CommunityCommentWithAuthor | null = null;

  if (focus) {
    const subtree = findCommentSubtree(detail.comments, focus);
    if (subtree) {
      focusedComment = subtree;
      commentRoots = [subtree];
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 md:pt-6">
      <Link
        href="/community"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to community
      </Link>

      <CommunityPostCard
        post={detail}
        currentUserId={user.id}
        isAdmin={isAdmin}
        href={`/community/${detail.id}`}
        isClickable={false}
      />

      {focusedComment && (
        <div className="mt-4 rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3 dark:border-indigo-800/60 dark:bg-indigo-950/30">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
              Viewing one thread
            </p>
            <Link
              href={`/community/${detail.id}`}
              className="text-xs font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              Show all replies
            </Link>
          </div>
        </div>
      )}

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {detail.comment_count === 0
            ? "No replies yet"
            : `${detail.comment_count} ${detail.comment_count === 1 ? "reply" : "replies"}`}
        </h2>

        {!focusedComment && (
          <div className="mb-4">
            <CommunityComposer
              mode={{
                kind: "comment",
                orgId: currentOrg.id,
                postId: detail.id,
                placeholder: "Add a reply…",
              }}
            />
          </div>
        )}

        <CommunityCommentThread
          postId={detail.id}
          orgId={currentOrg.id}
          comments={commentRoots}
          currentUserId={user.id}
          isAdmin={isAdmin}
          focusedCommentId={focus}
        />
      </section>
    </div>
  );
}
