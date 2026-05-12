"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { CommunityPostCard } from "./community-post-card";
import { loadMoreCommunityPosts } from "@/lib/actions/community";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type {
  CommunityPostWithAuthor,
  CommunityTag,
} from "@/types/database";

export function CommunityFeedLoadMore({
  orgId,
  tag,
  initialCursor,
  currentUserId,
  isAdmin,
}: {
  orgId: string;
  tag: CommunityTag | null;
  initialCursor: string | null;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [posts, setPosts] = useState<CommunityPostWithAuthor[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      try {
        const result = await loadMoreCommunityPosts({
          orgId,
          tag,
          before: cursor,
        });
        setPosts((prev) => [...prev, ...result.posts]);
        setCursor(result.nextCursor);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't load more posts"
        );
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {posts.map((post) => (
        <CommunityPostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          href={`/community/${post.id}`}
        />
      ))}
      {cursor && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={loadMore}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
