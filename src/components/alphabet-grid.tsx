import { BookA, PartyPopper } from "lucide-react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface AlphabetGridProps {
  coveredLetters: Set<string>;
}

export function AlphabetGrid({ coveredLetters }: AlphabetGridProps) {
  const count = coveredLetters.size;
  const pct = (count / 26) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookA className="h-4.5 w-4.5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">Alphabet Challenge</h3>
        </div>
        <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {count}/26
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5">
        {LETTERS.map((letter) => {
          const done = coveredLetters.has(letter);
          return (
            <div
              key={letter}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                done
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-300 border border-dashed border-gray-200"
              }`}
            >
              {letter}
            </div>
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
