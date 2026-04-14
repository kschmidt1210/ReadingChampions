import { BookA, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface AlphabetGridProps {
  coveredLetters: Set<string>;
  letterBookCounts?: Map<string, number>;
  activeLetterFilter?: string;
  onLetterClick?: (letter: string) => void;
}

export function AlphabetGrid({
  coveredLetters,
  letterBookCounts,
  activeLetterFilter,
  onLetterClick,
}: AlphabetGridProps) {
  const count = coveredLetters.size;
  const pct = (count / 26) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookA className="h-4.5 w-4.5 text-indigo-500" />
          <h3 className="font-semibold text-foreground">Alphabet Challenge</h3>
        </div>
        <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {count}/26
        </span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-[repeat(9,minmax(0,1fr))] sm:grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5">
        {LETTERS.map((letter) => {
          const done = coveredLetters.has(letter);
          const bookCount = letterBookCounts?.get(letter) ?? 0;
          const isActive = activeLetterFilter === letter;
          const clickable = done && onLetterClick;

          return (
            <button
              key={letter}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onLetterClick(letter)}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                done
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground border border-dashed border-border",
                clickable && "cursor-pointer hover:shadow-md hover:scale-105 active:scale-95",
                !clickable && "cursor-default",
                isActive && "ring-2 ring-indigo-400 ring-offset-1 shadow-md scale-105"
              )}
            >
              {letter}
              {done && bookCount > 1 && (
                <span className={cn(
                  "absolute -top-1 -right-1 flex items-center justify-center h-3.5 min-w-3.5 rounded-full text-[9px] font-bold leading-none px-0.5",
                  isActive
                    ? "bg-indigo-800 text-white"
                    : "bg-card text-indigo-700 shadow-sm border border-indigo-200"
                )}>
                  {bookCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {count >= 26 && (
        <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-200/60">
          <PartyPopper className="h-4 w-4" />
          All 26 letters! +14% bonus
        </div>
      )}
      {count >= 13 && count < 26 && (
        <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-200/60">
          <PartyPopper className="h-4 w-4" />
          13+ letters! +6% bonus
        </div>
      )}
    </div>
  );
}
