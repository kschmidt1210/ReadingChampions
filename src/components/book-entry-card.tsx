import { BookOpen, ChevronRight } from "lucide-react";
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
      className="group flex items-start gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-gray-100"
    >
      {entry.book.cover_url ? (
        <img
          src={entry.book.cover_url}
          alt={entry.book.title}
          className="w-14 h-20 object-cover rounded-lg shadow-sm"
        />
      ) : (
        <div className="w-14 h-20 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center shadow-sm">
          <BookOpen className="h-6 w-6 text-indigo-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate text-[0.95rem]">
          {entry.book.title}
        </h3>
        <p className="text-sm text-gray-500">{entry.book.author}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">
            {entry.book.pages} pages
          </span>
          {genreName && (
            <Badge variant="secondary" className="text-xs font-medium">
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
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-700">
            {Number(entry.points).toFixed(2)}
          </span>
          <div className="text-[0.65rem] text-gray-400 mt-1 text-center">pts</div>
          {entry.rating !== null && (
            <div className="text-xs text-gray-500 mt-0.5 text-center">
              {entry.rating}/10
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </div>
  );
}
