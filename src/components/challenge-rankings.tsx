import { Globe, BookOpen } from "lucide-react";
import type { ChallengeRanking } from "@/types/database";
import { cn } from "@/lib/utils";

const rankBadges: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-300/50" },
  2: { bg: "bg-indigo-100", text: "text-indigo-600", ring: "ring-indigo-300/50" },
  3: { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-300/50" },
};

function RankingCard({
  title,
  icon: Icon,
  iconColor,
  rankings,
  unitSingular,
  unitPlural,
  currentUserId,
}: {
  title: string;
  icon: typeof Globe;
  iconColor: string;
  rankings: ChallengeRanking[];
  unitSingular: string;
  unitPlural: string;
  currentUserId: string;
}) {
  if (rankings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("h-4.5 w-4.5", iconColor)} />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">
          No data yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <Icon className={cn("h-4.5 w-4.5", iconColor)} />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div>
        {rankings.map((entry, i) => {
          const badge = rankBadges[entry.rank];
          const isCurrentUser = entry.user_id === currentUserId;
          const unit = entry.value === 1 ? unitSingular : unitPlural;

          return (
            <div
              key={entry.user_id}
              className={cn(
                "flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-b-0",
                isCurrentUser && "bg-indigo-50/40"
              )}
            >
              <span className="w-7 shrink-0">
                {badge ? (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-[0.65rem] font-bold ring-1",
                      badge.bg,
                      badge.text,
                      badge.ring
                    )}
                  >
                    {entry.rank}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-gray-400">
                    {entry.rank}
                  </span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm font-medium block truncate",
                    isCurrentUser ? "text-indigo-700" : "text-gray-900"
                  )}
                >
                  {isCurrentUser ? "You" : entry.display_name}
                </span>
                {entry.detail && (
                  <span className="text-xs text-gray-400 block truncate">
                    {entry.detail}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-semibold text-gray-700 tabular-nums">
                  {entry.value}
                </span>
                <span className="text-xs text-gray-400 ml-1">{unit}</span>
                {entry.points_awarded > 0 && (
                  <span className="block text-[0.65rem] font-semibold text-emerald-600">
                    +{entry.points_awarded} pts
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChallengeRankings({
  countryRankings,
  seriesRankings,
  currentUserId,
}: {
  countryRankings: ChallengeRanking[];
  seriesRankings: ChallengeRanking[];
  currentUserId: string;
}) {
  if (countryRankings.length === 0 && seriesRankings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">Bonus Challenges</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RankingCard
          title="Most Countries"
          icon={Globe}
          iconColor="text-violet-500"
          rankings={countryRankings}
          unitSingular="country"
          unitPlural="countries"
          currentUserId={currentUserId}
        />
        <RankingCard
          title="Longest Series"
          icon={BookOpen}
          iconColor="text-rose-500"
          rankings={seriesRankings}
          unitSingular="book"
          unitPlural="books"
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
