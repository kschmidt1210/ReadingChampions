import Link from "next/link";
import type { LeaderboardPlayer } from "@/types/database";
import { cn } from "@/lib/utils";

const rankColors: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 ring-amber-300/50",
  2: "bg-indigo-100 text-indigo-600 ring-indigo-300/50",
  3: "bg-orange-100 text-orange-700 ring-orange-300/50",
};

export function LeaderboardTable({
  players,
  currentUserId,
}: {
  players: LeaderboardPlayer[];
  currentUserId: string;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="flex items-center px-5 py-3.5 bg-gray-50/80 border-b border-gray-200/80">
        <span className="w-12 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Rank
        </span>
        <span className="flex-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Player
        </span>
        <span className="w-16 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Books
        </span>
        <span className="w-20 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Pages
        </span>
        <span className="w-24 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Points
        </span>
      </div>
      {players.map((player) => {
        const isCurrentUser = player.user_id === currentUserId;
        const rankStyle = rankColors[player.rank];
        return (
          <div
            key={player.user_id}
            className={cn(
              "flex items-center px-5 py-4 border-b border-gray-100/80 last:border-b-0 transition-colors hover:bg-gray-50/60",
              isCurrentUser && "bg-indigo-50/50 border-l-[3px] border-l-indigo-500 hover:bg-indigo-50/70"
            )}
          >
            <span className="w-12">
              {rankStyle ? (
                <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ring-1", rankStyle)}>
                  {player.rank}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-semibold text-gray-400">
                  {player.rank}
                </span>
              )}
            </span>
            <Link
              href={isCurrentUser ? "/my-books" : `/player/${player.user_id}`}
              className={cn(
                "flex-1 font-semibold text-[0.95rem] hover:underline decoration-1 underline-offset-2",
                isCurrentUser ? "text-indigo-700" : "text-gray-900"
              )}
            >
              {isCurrentUser
                ? `You (${player.display_name})`
                : player.display_name}
            </Link>
            <span className={cn("w-16 text-center text-sm font-medium", isCurrentUser ? "text-indigo-600/80" : "text-gray-500")}>
              {player.book_count}
            </span>
            <span className={cn("w-20 text-center text-sm font-medium", isCurrentUser ? "text-indigo-600/80" : "text-gray-500")}>
              {player.page_count.toLocaleString()}
            </span>
            <span className="w-24 text-right">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-bold text-indigo-700">
                {player.total_points.toFixed(2)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
