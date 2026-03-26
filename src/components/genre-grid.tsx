interface GenreGridProps {
  genres: Array<{ id: string; name: string }>;
  coveredGenreIds: Set<string>;
}

export function GenreGrid({ genres, coveredGenreIds }: GenreGridProps) {
  const covered = genres.filter((g) => coveredGenreIds.has(g.id)).length;
  const total = genres.length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-gray-900">Genre Challenge</h3>
        <span className="text-sm text-gray-500">
          {covered}/{total}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {genres.map((genre) => {
          const done = coveredGenreIds.has(genre.id);
          return (
            <div
              key={genre.id}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                done
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {done && <span className="mr-1">&#10003;</span>}
              {genre.name}
            </div>
          );
        })}
      </div>
      {covered === total && total > 0 && (
        <p className="text-sm text-green-600 font-medium">
          Genre challenge complete! +10% bonus
        </p>
      )}
    </div>
  );
}
