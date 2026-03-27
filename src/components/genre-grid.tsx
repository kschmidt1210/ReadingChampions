import { BookOpen, Check, PartyPopper } from "lucide-react";

interface GenreGridProps {
  genres: Array<{ id: string; name: string }>;
  coveredGenreIds: Set<string>;
}

export function GenreGrid({ genres, coveredGenreIds }: GenreGridProps) {
  const covered = genres.filter((g) => coveredGenreIds.has(g.id)).length;
  const total = genres.length;
  const pct = total > 0 ? (covered / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-emerald-500" />
          <h3 className="font-semibold text-gray-900">Genre Challenge</h3>
        </div>
        <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {covered}/{total}
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {genres.map((genre) => {
          const done = coveredGenreIds.has(genre.id);
          return (
            <div
              key={genre.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                done
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                  : "bg-gray-50 text-gray-400 border border-dashed border-gray-200"
              }`}
            >
              {done && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
              <span className="truncate">{genre.name}</span>
            </div>
          );
        })}
      </div>

      {covered === total && total > 0 && (
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-200/60">
          <PartyPopper className="h-4 w-4" />
          Genre challenge complete! +10% bonus
        </div>
      )}
    </div>
  );
}
