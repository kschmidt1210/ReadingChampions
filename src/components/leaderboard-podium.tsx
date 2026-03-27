import Link from "next/link";
import type { LeaderboardPlayer } from "@/types/database";

const medals = ["\u{1F3C6}", "\u{1F948}", "\u{1F949}"];

const podiumStyles = [
  {
    card: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300/60 shadow-xl shadow-amber-500/10",
    glow: "bg-amber-400/20",
    points: "text-amber-700",
    size: "w-[11.5rem] pb-8 pt-7",
    medal: "text-6xl",
    name: "text-xl",
    score: "text-3xl",
  },
  {
    card: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border border-indigo-200/60 shadow-lg shadow-indigo-500/5",
    glow: "bg-indigo-400/15",
    points: "text-indigo-600",
    size: "w-44 pb-6 pt-6",
    medal: "text-5xl",
    name: "text-lg",
    score: "text-2xl",
  },
  {
    card: "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border border-orange-200/60 shadow-lg shadow-orange-500/5",
    glow: "bg-orange-400/15",
    points: "text-orange-700",
    size: "w-44 pb-6 pt-6",
    medal: "text-5xl",
    name: "text-lg",
    score: "text-2xl",
  },
];

export function LeaderboardPodium({
  players,
}: {
  players: LeaderboardPlayer[];
}) {
  const top3 = players.slice(0, 3);
  if (top3.length === 0) return null;

  const ordered = [top3[1], top3[0], top3[2]].filter(
    (p): p is LeaderboardPlayer => p != null
  );

  return (
    <div className="flex justify-center items-end gap-3 sm:gap-5 mb-8">
      {ordered.map((player) => {
        const rankIdx = player.rank - 1;
        const style = podiumStyles[rankIdx];
        const isFirst = player.rank === 1;
        return (
          <div
            key={player.user_id}
            className={`relative text-center rounded-2xl px-4 ${style.size} ${style.card} ${isFirst ? "-mt-4" : "mt-4"}`}
          >
            <div className={`absolute inset-0 rounded-2xl ${style.glow} blur-xl -z-10`} />
            <div className={`${style.medal} mb-2 drop-shadow-sm`}>
              {medals[rankIdx]}
            </div>
            <Link
              href={`/player/${player.user_id}`}
              className={`font-bold ${style.name} text-gray-900 hover:underline decoration-2 underline-offset-2 block truncate`}
            >
              {player.display_name}
            </Link>
            <div className={`${style.points} font-extrabold ${style.score} mt-1.5`}>
              {player.total_points.toFixed(1)}
            </div>
            <div className="text-xs font-medium text-gray-400 mt-1">
              {player.book_count} {player.book_count === 1 ? "book" : "books"} &middot;{" "}
              {player.page_count.toLocaleString()} pages
            </div>
          </div>
        );
      })}
    </div>
  );
}
