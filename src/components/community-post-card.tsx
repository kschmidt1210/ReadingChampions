import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommunityImageGrid } from "./community-image-grid";
import { CommunityReactionBar } from "./community-reaction-bar";
import { CommunityTagChip } from "./community-tag-filter";
import { CommunityItemActions } from "./community-post-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CommunityPostWithAuthor } from "@/types/database";

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function CommunityPostCard({
  post,
  currentUserId,
  isAdmin,
  href,
  isClickable = true,
}: {
  post: CommunityPostWithAuthor;
  currentUserId: string;
  isAdmin: boolean;
  href: string;
  isClickable?: boolean;
}) {
  const canDelete = post.user_id === currentUserId || isAdmin;
  const initials = post.author.display_name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const wasEdited = post.updated_at !== post.created_at;

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow",
        isClickable && "hover:shadow-md"
      )}
    >
      <header className="flex items-start gap-3">
        <Avatar size="default">
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">
              {post.author.display_name}
            </span>
            <CommunityTagChip tag={post.tag} />
          </div>
          <div className="text-xs text-muted-foreground">
            {relativeTime(post.created_at)}
            {wasEdited && <span className="ml-1">· edited</span>}
          </div>
        </div>
        {canDelete && <CommunityItemActions kind="post" id={post.id} />}
      </header>

      {post.body && (
        <BodyOrLink
          href={href}
          isClickable={isClickable}
          className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground"
        >
          {post.body}
        </BodyOrLink>
      )}

      {post.signed_image_urls.length > 0 && (
        <div className="mt-3">
          <CommunityImageGrid urls={post.signed_image_urls} />
        </div>
      )}

      <footer className="mt-3 flex items-center justify-between gap-2">
        <CommunityReactionBar
          targetType="post"
          targetId={post.id}
          reactions={post.reactions}
        />
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{post.comment_count}</span>
          <span className="hidden sm:inline">
            {post.comment_count === 1 ? "reply" : "replies"}
          </span>
        </Link>
      </footer>
    </article>
  );
}

function BodyOrLink({
  href,
  isClickable,
  className,
  children,
}: {
  href: string;
  isClickable: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (!isClickable) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={cn("block", className)}>
      {children}
    </Link>
  );
}
