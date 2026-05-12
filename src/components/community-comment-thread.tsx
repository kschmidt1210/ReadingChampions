import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommunityImageGrid } from "./community-image-grid";
import { CommunityReactionBar } from "./community-reaction-bar";
import { CommunityItemActions } from "./community-post-actions";
import { CommunityCommentReplyToggle } from "./community-comment-reply-toggle";
import { cn } from "@/lib/utils";
import type { CommunityCommentWithAuthor } from "@/types/database";

const DESKTOP_INDENT_LIMIT = 3;
const MOBILE_INDENT_LIMIT = 2;

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function CommunityCommentThread({
  postId,
  orgId,
  comments,
  currentUserId,
  isAdmin,
  focusedCommentId,
  depth = 0,
}: {
  postId: string;
  orgId: string;
  comments: CommunityCommentWithAuthor[];
  currentUserId: string;
  isAdmin: boolean;
  focusedCommentId?: string;
  depth?: number;
}) {
  if (comments.length === 0) return null;

  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <CommentNode
          key={c.id}
          comment={c}
          postId={postId}
          orgId={orgId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          focusedCommentId={focusedCommentId}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function CommentNode({
  comment,
  postId,
  orgId,
  currentUserId,
  isAdmin,
  focusedCommentId,
  depth,
}: {
  comment: CommunityCommentWithAuthor;
  postId: string;
  orgId: string;
  currentUserId: string;
  isAdmin: boolean;
  focusedCommentId?: string;
  depth: number;
}) {
  const isDeleted = !!comment.deleted_at;
  const canDelete = !isDeleted && (comment.user_id === currentUserId || isAdmin);
  const initials = comment.author.display_name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const wasEdited = !isDeleted && comment.updated_at !== comment.created_at;

  const collapseDesktop = depth >= DESKTOP_INDENT_LIMIT;
  const collapseMobile = depth >= MOBILE_INDENT_LIMIT;
  const collapse = collapseDesktop;
  const collapseMobileOnly = collapseMobile && !collapseDesktop;

  return (
    <li
      className={cn(
        "group/comment relative",
        depth > 0 &&
          "border-l-2 border-border pl-3 sm:pl-4 [&:hover]:border-indigo-300 dark:[&:hover]:border-indigo-700"
      )}
    >
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-3 shadow-sm",
          isDeleted && "border-dashed bg-muted/50"
        )}
      >
        {isDeleted ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground italic">
            <span>[Comment removed]</span>
          </div>
        ) : (
          <>
            <header className="flex items-start gap-2.5">
              <Avatar size="sm">
                <AvatarFallback>{initials || "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight text-foreground">
                  {comment.author.display_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {relativeTime(comment.created_at)}
                  {wasEdited && <span className="ml-1">· edited</span>}
                </div>
              </div>
              {canDelete && (
                <CommunityItemActions
                  kind="comment"
                  id={comment.id}
                  className="-mr-1 -mt-1 h-7 w-7"
                />
              )}
            </header>

            {comment.body && (
              <p className="mt-2 whitespace-pre-wrap text-[0.92rem] leading-relaxed text-foreground">
                {comment.body}
              </p>
            )}

            {comment.signed_image_urls.length > 0 && (
              <div className="mt-2">
                <CommunityImageGrid urls={comment.signed_image_urls} />
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <CommunityReactionBar
                targetType="comment"
                targetId={comment.id}
                reactions={comment.reactions}
                size="sm"
              />
              <CommunityCommentReplyToggle
                postId={postId}
                orgId={orgId}
                parentCommentId={comment.id}
              />
            </div>
          </>
        )}
      </div>

      {comment.children.length > 0 &&
        (collapse ? (
          <div className="mt-2 pl-2">
            <Link
              href={`/community/${postId}?focus=${comment.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            >
              Continue thread →
              <span className="tabular-nums">
                ({countDescendants(comment.children)})
              </span>
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              "mt-3 space-y-3",
              collapseMobileOnly && "max-md:hidden"
            )}
          >
            <CommunityCommentThread
              postId={postId}
              orgId={orgId}
              comments={comment.children}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              focusedCommentId={focusedCommentId}
              depth={depth + 1}
            />
          </div>
        ))}

      {collapseMobileOnly && comment.children.length > 0 && (
        <div className="mt-2 pl-2 md:hidden">
          <Link
            href={`/community/${postId}?focus=${comment.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          >
            Continue thread →
            <span className="tabular-nums">
              ({countDescendants(comment.children)})
            </span>
          </Link>
        </div>
      )}
    </li>
  );
}

function countDescendants(nodes: CommunityCommentWithAuthor[]): number {
  let n = 0;
  for (const c of nodes) {
    n += 1 + countDescendants(c.children);
  }
  return n;
}
