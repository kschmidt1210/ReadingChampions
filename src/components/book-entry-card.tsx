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
  const status = entry.status;
  const points = Number(entry.points);
  const isReading = status === "reading";
  const isDnf = status === "did_not_finish";

  const cardBg = isReading
    ? "bg-amber-50/40 border-amber-200/60"
    : isDnf
      ? "bg-gray-50/60 border-gray-200/60"
      : "bg-white border-gray-100";

  const coverFallbackBg = isReading
    ? "bg-gradient-to-br from-amber-100 to-orange-100"
    : isDnf
      ? "bg-gradient-to-br from-gray-100 to-gray-200"
      : "bg-gradient-to-br from-indigo-100 to-violet-100";

  const coverFallbackIcon = isReading
    ? "text-amber-400"
    : isDnf
      ? "text-gray-400"
      : "text-indigo-400";

  const pointsPillStyle = isReading
    ? "bg-amber-50 text-amber-700 border border-dashed border-amber-300"
    : isDnf
      ? "bg-gray-100 text-gray-500"
      : "bg-indigo-50 text-indigo-700";

  const pageDisplay = (isReading || isDnf) && entry.pages_read
    ? `${entry.pages_read} / ${entry.book.pages} pages`
    : `${entry.book.pages} pages`;

  return (
    <div
      onClick={onClick}
      className={`group flex items-start gap-4 p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border ${cardBg}`}
    >
      {entry.book.cover_url ? (
        <img
          src={entry.book.cover_url}
          alt={entry.book.title}
          className="w-14 h-20 object-cover rounded-lg shadow-sm"
        />
      ) : (
        <div className={`w-14 h-20 rounded-lg flex items-center justify-center shadow-sm ${coverFallbackBg}`}>
          <BookOpen className={`h-6 w-6 ${coverFallbackIcon}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate text-[0.95rem]">
          {entry.book.title}
        </h3>
        <p className="text-sm text-gray-500">{entry.book.author}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">
            {pageDisplay}
          </span>
          {isReading && (
            <Badge variant="outline" className="text-xs font-medium text-amber-700 border-amber-300 bg-amber-50">
              In Progress
            </Badge>
          )}
          {isDnf && (
            <Badge variant="outline" className="text-xs font-medium text-gray-500 border-gray-300 bg-gray-50">
              DNF
            </Badge>
          )}
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
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold ${pointsPillStyle}`}>
            {points.toFixed(2)}
          </span>
          <div className="text-[0.65rem] text-gray-400 mt-1 text-center">
            {isReading ? "pending" : "pts"}
          </div>
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
