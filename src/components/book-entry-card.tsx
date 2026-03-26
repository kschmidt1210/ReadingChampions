import type { BookEntryWithBook } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function BookEntryCard({
  entry,
  genreName,
  onClick,
}: {
  entry: BookEntryWithBook;
  genreName?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
    >
      {entry.book.cover_url && (
        <img
          src={entry.book.cover_url}
          alt={entry.book.title}
          className="w-12 h-16 object-cover rounded"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">
          {entry.book.title}
        </h3>
        <p className="text-sm text-gray-500">{entry.book.author}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-gray-400">
            {entry.book.pages} pages
          </span>
          {genreName && (
            <Badge variant="secondary" className="text-xs">
              {genreName}
            </Badge>
          )}
          {entry.date_finished && (
            <span className="text-xs text-gray-400">
              {format(new Date(entry.date_finished), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-bold text-indigo-600">
          {Number(entry.points).toFixed(2)}
        </div>
        <div className="text-xs text-gray-400">pts</div>
        {entry.rating !== null && (
          <div className="text-xs text-gray-500 mt-1">
            {entry.rating}/10
          </div>
        )}
      </div>
    </div>
  );
}
