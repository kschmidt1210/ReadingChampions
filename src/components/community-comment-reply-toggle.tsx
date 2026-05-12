"use client";

import { useState } from "react";
import { Reply } from "lucide-react";
import { CommunityComposer } from "./community-composer";

export function CommunityCommentReplyToggle({
  postId,
  orgId,
  parentCommentId,
}: {
  postId: string;
  orgId: string;
  parentCommentId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Reply className="h-3.5 w-3.5" />
          Reply
        </button>
      ) : (
        <div className="mt-2">
          <CommunityComposer
            mode={{
              kind: "comment",
              orgId,
              postId,
              parentCommentId,
              autoFocus: true,
              placeholder: "Write a reply…",
              onPosted: () => setOpen(false),
            }}
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
