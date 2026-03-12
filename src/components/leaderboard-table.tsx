import type { LeaderboardPlayer } from "@/types/database";
import { cn } from "@/lib/utils";

const rankBgs: Record<number, string> = {
  1: "bg-yellow-50",
  2: "bg-indigo-50/50",
  3: "bg-orange-50/50",
};

const medals: Record<number, string> = {
  1: "\u{1F3C6}",
  2: "\u{1F948}",
  3: "\u{1F949}",
};

export function LeaderboardTable({
  players,
  currentUserId,
}: {
  players: LeaderboardPlayer[];
  currentUserId: string;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center px-5 py-3 bg-gray-50 border-b-2 border-gray-200">
        <span className="w-9 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          #
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
        <span className="w-20 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Points
        </span>
      </div>
      {/* Rows */}
      {players.map((player) => {
        const isCurrentUser = player.user_id === currentUserId;
        const medal = medals[player.rank];
        return (
          <div
            key={player.user_id}
            className={cn(
              "flex items-center px-5 py-3.5 border-b border-gray-100 last:border-b-0",
              rankBgs[player.rank],
              isCurrentUser &&
                "bg-indigo-50 border-l-[3px] border-l-indigo-500"
            )}
          >
            <span
              className={cn(
                "w-9 font-bold text-base",
                isCurrentUser
                  ? "text-indigo-600"
                  : medal
                    ? ""
                    : "text-gray-400"
              )}
            >
              {medal ?? player.rank}
            </span>
            <span
              className={cn(
                "flex-1 font-semibold text-base",
                isCurrentUser ? "text-indigo-600" : "text-gray-900"
              )}
            >
              {isCurrentUser
                ? `You (${player.display_name})`
                : player.display_name}
            </span>
            <span
              className={cn(
                "w-16 text-center text-sm",
                isCurrentUser ? "text-indigo-600/70" : "text-gray-500"
              )}
            >
              {player.book_count}
            </span>
            <span
              className={cn(
                "w-20 text-center text-sm",
                isCurrentUser ? "text-indigo-600/70" : "text-gray-500"
              )}
            >
              {player.page_count.toLocaleString()}
            </span>
            <span className={cn("w-20 text-right font-bold text-base text-indigo-600")}>
              {player.total_points.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
