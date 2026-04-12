"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Loader2 } from "lucide-react";

interface ManagedPlayerTabsProps {
  managedPlayers: Array<{ userId: string; displayName: string }>;
  activePlayerId: string | null;
}

export function ManagedPlayerTabs({
  managedPlayers,
  activePlayerId,
}: ManagedPlayerTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (managedPlayers.length === 0) return null;

  function switchTo(playerId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (playerId) {
      params.set("player", playerId);
    } else {
      params.delete("player");
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(`/my-books${qs ? `?${qs}` : ""}`);
    });
  }

  return (
    <div className="flex items-center gap-2 px-4 md:px-8 pt-4">
      {isPending ? (
        <Loader2 className="h-4 w-4 text-indigo-400 shrink-0 animate-spin" />
      ) : (
        <Users className="h-4 w-4 text-gray-400 shrink-0" />
      )}
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => switchTo(null)}
          disabled={isPending}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            !activePlayerId
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          } ${isPending ? "opacity-60 cursor-wait" : ""}`}
        >
          My Books
        </button>
        {managedPlayers.map((mp) => (
          <button
            key={mp.userId}
            onClick={() => switchTo(mp.userId)}
            disabled={isPending}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              activePlayerId === mp.userId
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            } ${isPending ? "opacity-60 cursor-wait" : ""}`}
          >
            {mp.displayName}
          </button>
        ))}
      </div>
    </div>
  );
}
