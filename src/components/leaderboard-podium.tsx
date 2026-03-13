import Link from "next/link";
import type { LeaderboardPlayer } from "@/types/database";

const medals = ["\u{1F3C6}", "\u{1F948}", "\u{1F949}"];
const cardStyles = [
  "border-2 border-indigo-500 shadow-lg shadow-indigo-500/15", // 1st
  "shadow-md", // 2nd
  "shadow-md", // 3rd
];

export function LeaderboardPodium({
  players,
}: {
  players: LeaderboardPlayer[];
}) {
  const top3 = players.slice(0, 3);
  if (top3.length === 0) return null;

  // Display order: 2nd, 1st, 3rd
  const ordered = [top3[1], top3[0], top3[2]].filter(
    (p): p is LeaderboardPlayer => p != null
  );

  return (
    <div className="flex justify-center gap-4 mb-6">
      {ordered.map((player) => {
        const actualRank = player.rank - 1; // 0-indexed for medal lookup
        const isFirst = player.rank === 1;
        return (
          <div
            key={player.user_id}
            className={`text-center bg-white rounded-2xl p-6 ${cardStyles[actualRank]} ${
              isFirst ? "w-48 -mb-3" : "w-44"
            }`}
          >
            <div className={`${isFirst ? "text-5xl" : "text-4xl"} mb-1`}>
              {medals[actualRank]}
            </div>
            <Link
              href={`/player/${player.user_id}`}
              className={`font-bold ${isFirst ? "text-xl" : "text-lg"} mt-1 text-gray-900 hover:underline`}
            >
              {player.display_name}
            </Link>
            <div
              className={`text-indigo-600 font-extrabold ${isFirst ? "text-3xl" : "text-2xl"} mt-1`}
            >
              {player.total_points.toFixed(1)}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              {player.book_count}{" "}
              {player.book_count === 1 ? "book" : "books"} &middot;{" "}
              {player.page_count.toLocaleString()} pages
            </div>
          </div>
        );
      })}
    </div>
  );
}
