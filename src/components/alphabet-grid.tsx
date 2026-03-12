const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface AlphabetGridProps {
  coveredLetters: Set<string>;
}

export function AlphabetGrid({ coveredLetters }: AlphabetGridProps) {
  const count = coveredLetters.size;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-gray-900">Alphabet Challenge</h3>
        <span className="text-sm text-gray-500">{count}/26</span>
      </div>
      <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
        {LETTERS.map((letter) => {
          const done = coveredLetters.has(letter);
          return (
            <div
              key={letter}
              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold ${
                done
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-300"
              }`}
            >
              {letter}
            </div>
          );
        })}
      </div>
      {count >= 26 && (
        <p className="text-sm text-indigo-600 font-medium">
          All 26 letters! +14% bonus
        </p>
      )}
      {count >= 13 && count < 26 && (
        <p className="text-sm text-indigo-600 font-medium">
          13+ letters! +6% bonus
        </p>
      )}
    </div>
  );
}
