import { BookOpen, ChevronRight, MessageSquareText, Lock } from "lucide-react";
import type { BookEntryWithBook } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  BONUS_LABELS,
  DEDUCTION_LABELS,
  HOMETOWN_BONUS_LABELS,
} from "@/lib/scoring-types";
import type { BonusKey, HometownBonusKey, DeductionKey } from "@/types/database";

function DetailBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200/60">
      {children}
    </span>
  );
}

export function BookEntryCard({
  entry,
  genreName,
  onClick,
  detailed = false,
}: {
  entry: BookEntryWithBook;
  genreName?: string;
  onClick?: () => void;
  detailed?: boolean;
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

  const bonuses: string[] = [];
  if (entry.bonus_1) bonuses.push(BONUS_LABELS[entry.bonus_1 as BonusKey]);
  if (entry.bonus_2) bonuses.push(BONUS_LABELS[entry.bonus_2 as BonusKey]);
  if (entry.bonus_3) bonuses.push(BONUS_LABELS[entry.bonus_3 as BonusKey]);
  if (entry.hometown_bonus)
    bonuses.push(HOMETOWN_BONUS_LABELS[entry.hometown_bonus as HometownBonusKey]);

  const deductionLabel = entry.deduction
    ? DEDUCTION_LABELS[entry.deduction as DeductionKey]
    : null;

  const hasDetailContent =
    detailed &&
    (bonuses.length > 0 ||
      deductionLabel ||
      entry.series_name ||
      entry.book.country ||
      entry.book.year_published);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-start gap-4 p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200 cursor-pointer border w-full text-left ${cardBg}`}
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
          {entry.review && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MessageSquareText className="h-3 w-3" />
              {entry.review.visibility === "private" && (
                <Lock className="h-2.5 w-2.5" />
              )}
            </span>
          )}
        </div>

        {detailed && entry.review && (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 italic">
            &ldquo;{entry.review.review_text}&rdquo;
          </p>
        )}

        {detailed && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <DetailBadge>{entry.fiction ? "Fiction" : "Nonfiction"}</DetailBadge>
            {entry.book.year_published && (
              <DetailBadge>{entry.book.year_published}</DetailBadge>
            )}
            {entry.book.country && (
              <DetailBadge>{entry.book.country}</DetailBadge>
            )}
            {entry.series_name && (
              <DetailBadge>{entry.series_name}</DetailBadge>
            )}
          </div>
        )}

        {hasDetailContent && (bonuses.length > 0 || deductionLabel) && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {bonuses.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              >
                +{label}
              </span>
            ))}
            {deductionLabel && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                {deductionLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold ${pointsPillStyle}`}>
            {points.toFixed(2)}
          </span>
          <div className="text-xs text-gray-400 mt-1 text-center">
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
    </button>
  );
}
