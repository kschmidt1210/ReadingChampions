import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentOrg,
  getUserOrganizations,
} from "@/lib/queries/organizations";
import { getCommunityFeed } from "@/lib/queries/community";
import { CommunityComposer } from "@/components/community-composer";
import { CommunityPostCard } from "@/components/community-post-card";
import { CommunityTagFilter } from "@/components/community-tag-filter";
import { CommunityFeedLoadMore } from "@/components/community-feed-load-more";
import type { CommunityTag } from "@/types/database";

const VALID_TAGS: CommunityTag[] = [
  "recommendation",
  "rules",
  "leaderboard",
  "milestone",
  "general",
];

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const activeTag: CommunityTag | null = VALID_TAGS.includes(
    params.tag as CommunityTag
  )
    ? (params.tag as CommunityTag)
    : null;

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
          Join a competition to use the community feed.
        </p>
      </div>
    );
  }

  const isAdmin = currentOrg.role === "admin";
  const { posts, nextCursor } = await getCommunityFeed(currentOrg.id, {
    tag: activeTag,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 md:pt-6">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-fuchsia-500" />
          Community
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with the {currentOrg.name} crew. Recs, rule questions, banter.
        </p>
      </header>

      <CommunityComposer mode={{ kind: "post", orgId: currentOrg.id }} />

      <div className="mt-4">
        <CommunityTagFilter activeTag={activeTag} />
      </div>

      {posts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            {activeTag ? "Nothing here yet" : "Be the first to post"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTag
              ? "Try clearing the filter or starting the conversation."
              : "Share a book recommendation, ask a rules question, or just say hi."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              isAdmin={isAdmin}
              href={`/community/${post.id}`}
            />
          ))}
        </div>
      )}

      {nextCursor && (
        <CommunityFeedLoadMore
          orgId={currentOrg.id}
          tag={activeTag}
          initialCursor={nextCursor}
          currentUserId={user.id}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
