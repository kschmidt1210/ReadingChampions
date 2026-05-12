"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import type { CommunityTag } from "@/types/database";

export const COMMUNITY_TAG_OPTIONS: Array<{
  value: CommunityTag;
  label: string;
  color: string;
}> = [
  { value: "recommendation", label: "Rec", color: "text-emerald-600 dark:text-emerald-400" },
  { value: "rules", label: "Rules", color: "text-teal-600 dark:text-teal-400" },
  { value: "leaderboard", label: "Board", color: "text-amber-600 dark:text-amber-400" },
  { value: "milestone", label: "Milestone", color: "text-fuchsia-600 dark:text-fuchsia-400" },
  { value: "general", label: "General", color: "text-muted-foreground" },
];

export function CommunityTagFilter({
  activeTag,
}: {
  activeTag: CommunityTag | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setTag(next: CommunityTag | null) {
    const params = new URLSearchParams(search?.toString() ?? "");
    if (next) params.set("tag", next);
    else params.delete("tag");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname ?? "/community");
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Filter posts by tag"
      className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <FilterChip
        label="All"
        isActive={activeTag === null}
        disabled={isPending}
        onClick={() => setTag(null)}
        colorClass="text-foreground"
      />
      {COMMUNITY_TAG_OPTIONS.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          isActive={activeTag === opt.value}
          disabled={isPending}
          onClick={() => setTag(opt.value)}
          colorClass={opt.color}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  isActive,
  disabled,
  onClick,
  colorClass,
}: {
  label: string;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
  colorClass: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-colors",
        isActive
          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200"
          : cn("border-border bg-card hover:bg-muted", colorClass)
      )}
    >
      {label}
    </button>
  );
}

export function CommunityTagChip({
  tag,
  className,
}: {
  tag: CommunityTag | null;
  className?: string;
}) {
  if (!tag) return null;
  const opt = COMMUNITY_TAG_OPTIONS.find((o) => o.value === tag);
  if (!opt) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full bg-muted px-2 text-[0.7rem] font-medium",
        opt.color,
        className
      )}
    >
      {opt.label}
    </span>
  );
}
