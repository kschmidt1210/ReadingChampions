"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  deleteCommunityPost,
  deleteCommunityComment,
} from "@/lib/actions/community";
import { cn } from "@/lib/utils";

export function CommunityItemActions({
  kind,
  id,
  redirectAfterDelete,
  className,
}: {
  kind: "post" | "comment";
  id: string;
  redirectAfterDelete?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        if (kind === "post") {
          await deleteCommunityPost(id);
        } else {
          await deleteCommunityComment(id);
        }
        toast.success(kind === "post" ? "Post deleted" : "Reply deleted");
        setOpen(false);
        if (redirectAfterDelete) {
          router.push(redirectAfterDelete);
        } else {
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirming(false);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Item actions"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-44 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete {kind === "post" ? "post" : "reply"}
          </button>
        ) : (
          <div className="space-y-1.5 px-1.5 py-1">
            <p className="text-xs text-muted-foreground">
              Delete this {kind === "post" ? "post" : "reply"}?
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-destructive px-2 py-1.5 text-xs font-medium text-white hover:brightness-110"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
