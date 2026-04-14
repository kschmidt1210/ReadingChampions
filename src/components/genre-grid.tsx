import { BookOpen, Check, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenreGridProps {
  genres: Array<{ id: string; name: string }>;
  coveredGenreIds: Set<string>;
  genreBookCounts?: Map<string, number>;
  activeGenreFilter?: string;
  onGenreClick?: (genreId: string) => void;
}

export function GenreGrid({
  genres,
  coveredGenreIds,
  genreBookCounts,
  activeGenreFilter,
  onGenreClick,
}: GenreGridProps) {
  const covered = genres.filter((g) => coveredGenreIds.has(g.id)).length;
  const total = genres.length;
  const pct = total > 0 ? (covered / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-emerald-500" />
          <h3 className="font-semibold text-foreground">Genre Challenge</h3>
        </div>
        <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {covered}/{total}
        </span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {genres.map((genre) => {
          const done = coveredGenreIds.has(genre.id);
          const bookCount = genreBookCounts?.get(genre.id) ?? 0;
          const isActive = activeGenreFilter === genre.id;
          const clickable = done && onGenreClick;

          return (
            <button
              key={genre.id}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onGenreClick(genre.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                done
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                  : "bg-muted text-muted-foreground border border-dashed border-border",
                clickable && "cursor-pointer hover:shadow-sm hover:border-emerald-300 active:scale-[0.98]",
                !clickable && "cursor-default",
                isActive && "ring-2 ring-emerald-500 border-emerald-400 shadow-sm"
              )}
            >
              {done && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
              <span className="truncate flex-1">{genre.name}</span>
              {done && bookCount > 0 && (
                <span className={cn(
                  "shrink-0 tabular-nums text-xs rounded-full px-1.5 py-0.5 font-semibold",
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-700"
                )}>
                  {bookCount}
                </span>
              )}
            </button>
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
