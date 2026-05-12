"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toggleCommunityReaction } from "@/lib/actions/community";
import { cn } from "@/lib/utils";
import type {
  CommunityReactionTarget,
  ReactionSummary,
} from "@/types/database";

const CommunityEmojiPicker = dynamic(
  () => import("./community-emoji-picker").then((m) => m.CommunityEmojiPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] w-[320px] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    ),
  }
);

export function CommunityReactionBar({
  targetType,
  targetId,
  reactions: initialReactions,
  size = "default",
}: {
  targetType: CommunityReactionTarget;
  targetId: string;
  reactions: ReactionSummary[];
  size?: "default" | "sm";
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  function applyToggle(emoji: string) {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        if (existing.mine) {
          if (existing.count <= 1) {
            return prev.filter((r) => r.emoji !== emoji);
          }
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r
          );
        }
        return prev.map((r) =>
          r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r
        );
      }
      return [...prev, { emoji, count: 1, mine: true }];
    });

    startTransition(async () => {
      try {
        await toggleCommunityReaction({ targetType, targetId, emoji });
      } catch {
        setReactions(initialReactions);
      }
    });
  }

  const pillSize =
    size === "sm"
      ? "h-7 px-1.5 text-xs gap-1"
      : "h-8 px-2 text-sm gap-1.5";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          aria-pressed={r.mine}
          disabled={isPending}
          onClick={() => applyToggle(r.emoji)}
          className={cn(
            "inline-flex items-center rounded-full border transition-colors",
            pillSize,
            r.mine
              ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/60"
              : "border-border bg-card text-foreground hover:bg-muted"
          )}
        >
          <span className="leading-none">{r.emoji}</span>
          <span className="font-medium tabular-nums">{r.count}</span>
        </button>
      ))}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Add reaction"
              className={cn(
                "inline-flex items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                size === "sm" ? "h-7 w-7" : "h-8 w-8"
              )}
            >
              <SmilePlus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <CommunityEmojiPicker
            onPick={(emoji) => {
              applyToggle(emoji);
              setPickerOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
