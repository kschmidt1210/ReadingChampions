"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { BookOpen, ChevronDown, Lock, Globe, MessageSquareText, Trash2, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookSearch } from "./book-search";
import { GenrePicker } from "./genre-picker";
import { SeriesPicker } from "./series-picker";
import { ScorePreview } from "./score-preview";
import { BonusChips } from "./bonus-chips";
import { DeductionChips } from "./deduction-chips";
import { HometownBonusChips } from "./hometown-bonus-chips";
import { CountryPicker } from "./country-picker";
import { calculateBookScore } from "@/lib/scoring";
import { useOrg } from "./providers";
import { findOrCreateBook, createBookEntry, updateBookEntry, deleteBookEntry, getUserSeasonCountries, getSeasonSeriesNames } from "@/lib/actions/books";
import { createOrUpdateReview, deleteReview, adminSetReviewPrivate } from "@/lib/actions/reviews";
import { toast } from "sonner";
import type { ParsedBook } from "@/lib/books-api";
import type { BookEntryStatus, BookEntryWithBook, BonusKey, DeductionKey, HometownBonusKey, ScoringRulesConfig, ReviewVisibility } from "@/types/database";

const DEFAULT_SCORING_CONFIG: ScoringRulesConfig = {
  base_points: { fiction: 0.71, nonfiction: 1.26 },
  page_points: { first_100_rate: 0.0028, beyond_100_rate: 0.01 },
  bonuses: {
    classics_1900: 0.072, classics_1750: 0.143, classics_pre1750: 0.286,
    series: 0.143, translation: 0.057, birth_year: 0.029,
    current_year: 0.057, holiday_event: 0.029, award_winner: 0.057,
    new_country: 0.057,
  },
  hometown_bonuses: { state_setting: 0.029, state_name: 0.0029, city_name: 0.0058 },
  deductions: {
    graphic_novel: 0.3, comics_manga: 0.2, audiobook: 0.75,
    reread: 0.5, audiobook_reread: 0.25,
  },
  season_bonuses: { genre_complete_pct: 0.10, alphabet_13_pct: 0.06, alphabet_26_pct: 0.14 },
  longest_road: { countries: [10, 7, 4], series: [8, 5, 3] },
};

interface BookEntryPanelProps {
  open: boolean;
  onClose: () => void;
  genres?: Array<{ id: string; name: string }>;
  seasonId?: string;
  scoringConfig?: ScoringRulesConfig;
  entry?: BookEntryWithBook;
  canEdit?: boolean;
  canDelete?: boolean;
  isEntryOwner?: boolean;
  isAdmin?: boolean;
}

function ReviewSection({
  reviewText,
  reviewVisibility,
  onReviewTextChange,
  onVisibilityChange,
  canEditReview,
  isAdmin,
  existingReview,
  orgId,
  onReviewDeleted,
  confirmingDelete,
  onConfirmingDeleteChange,
  deletingReview,
  onDeletingReviewChange,
}: {
  reviewText: string;
  reviewVisibility: ReviewVisibility;
  onReviewTextChange: (v: string) => void;
  onVisibilityChange: (v: ReviewVisibility) => void;
  canEditReview: boolean;
  isAdmin: boolean;
  existingReview: BookEntryWithBook["review"];
  orgId: string;
  onReviewDeleted: () => void;
  confirmingDelete: boolean;
  onConfirmingDeleteChange: (v: boolean) => void;
  deletingReview: boolean;
  onDeletingReviewChange: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasReview = !!existingReview || reviewText.trim().length > 0;

  useEffect(() => {
    if (hasReview) setOpen(true);
  }, [hasReview]);

  async function handleAdminMakePrivate() {
    if (!existingReview || !orgId) return;
    try {
      await adminSetReviewPrivate(existingReview.id, orgId);
      toast.success("Review set to private.");
    } catch {
      toast.error("Failed to update review visibility.");
    }
  }

  async function handleAdminDelete() {
    if (!existingReview || !orgId) return;
    onDeletingReviewChange(true);
    try {
      await deleteReview(existingReview.id, orgId);
      toast.success("Review deleted.");
      onReviewDeleted();
    } catch {
      toast.error("Failed to delete review.");
    } finally {
      onDeletingReviewChange(false);
      onConfirmingDeleteChange(false);
    }
  }

  if (!canEditReview && !existingReview) return null;

  if (!canEditReview && existingReview) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Review</span>
          {existingReview.visibility === "private" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs font-medium">
              <Lock className="h-3 w-3" />
              Private
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">
              <Globe className="h-3 w-3" />
              Public
            </span>
          )}
        </div>
        <div className="px-4 pb-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {existingReview.review_text}
          </p>
        </div>
        {isAdmin && existingReview.visibility === "public" && (
          <div className="px-4 pb-3 flex gap-2 border-t border-gray-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleAdminMakePrivate}
            >
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              Make Private
            </Button>
            {confirmingDelete ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                  onClick={handleAdminDelete}
                  disabled={deletingReview}
                >
                  {deletingReview ? "Deleting..." : "Confirm"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => onConfirmingDeleteChange(false)}
                  disabled={deletingReview}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => onConfirmingDeleteChange(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Review
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-gray-400" />
          {hasReview ? "Review" : "Write a review"}
          {hasReview && (
            <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-semibold">
              {reviewVisibility === "public" ? "Public" : "Private"}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="space-y-1.5">
            <textarea
              value={reviewText}
              onChange={(e) => onReviewTextChange(e.target.value)}
              placeholder="What did you think of this book?"
              maxLength={5000}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-colors resize-y min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {reviewText.length.toLocaleString()} / 5,000
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Visibility</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-200/60 p-1">
              <button
                type="button"
                onClick={() => onVisibilityChange("private")}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 md:py-1.5 text-sm font-medium transition-all ${
                  reviewVisibility === "private"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                Private
              </button>
              <button
                type="button"
                onClick={() => onVisibilityChange("public")}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 md:py-1.5 text-sm font-medium transition-all ${
                  reviewVisibility === "public"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Public
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {reviewVisibility === "private"
                ? "Only visible to you."
                : "Visible to other players in your competition."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookEntryPanel({
  open,
  onClose,
  genres = [],
  seasonId,
  scoringConfig = DEFAULT_SCORING_CONFIG,
  entry,
  canEdit = false,
  canDelete = false,
  isEntryOwner = false,
  isAdmin = false,
}: BookEntryPanelProps) {
  const { currentOrgId } = useOrg();
  const isEditMode = !!entry;
  const readOnly = isEditMode && !canEdit;

  const [selectedBook, setSelectedBook] = useState<ParsedBook | null>(null);
  const [pages, setPages] = useState(0);
  const [fiction, setFiction] = useState(true);
  const [status, setStatus] = useState<BookEntryStatus>("completed");
  const [pagesRead, setPagesRead] = useState<string>("");
  const [seriesName, setSeriesName] = useState("");
  const [genreId, setGenreId] = useState<string | null>(null);
  const [genreName, setGenreName] = useState("");
  const [dateFinished, setDateFinished] = useState(new Date().toISOString().split("T")[0]);
  const [rating, setRating] = useState<string>("7");
  const [country, setCountry] = useState("");
  const [bonuses, setBonuses] = useState<(BonusKey | null)[]>([null, null, null]);
  const [hometownBonus, setHometownBonus] = useState<HometownBonusKey | null>(null);
  const [deduction, setDeduction] = useState<DeductionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [existingCountries, setExistingCountries] = useState<string[]>([]);
  const [seasonSeries, setSeasonSeries] = useState<string[]>([]);
  const [detectedSeries, setDetectedSeries] = useState<string | null>(null);

  const [reviewText, setReviewText] = useState("");
  const [reviewVisibility, setReviewVisibility] = useState<ReviewVisibility>("private");
  const [confirmingReviewDelete, setConfirmingReviewDelete] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  const populateFromEntry = useCallback((e: BookEntryWithBook) => {
    setPages(e.book.pages);
    setFiction(e.fiction);
    setStatus(e.status);
    setPagesRead(e.pages_read !== null ? String(e.pages_read) : "");
    setSeriesName(e.series_name ?? "");
    setGenreId(e.genre_id ?? null);
    setGenreName(e.genre_name ?? "");
    setDateFinished(e.date_finished ?? new Date().toISOString().split("T")[0]);
    setRating(e.rating !== null ? String(e.rating) : "");
    setCountry(e.book.country ?? "");
    setBonuses([e.bonus_1, e.bonus_2, e.bonus_3]);
    setHometownBonus(e.hometown_bonus);
    setDeduction(e.deduction);
    setReviewText(e.review?.review_text ?? "");
    setReviewVisibility(e.review?.visibility ?? "private");
  }, []);

  useEffect(() => {
    if (open && entry) {
      populateFromEntry(entry);
    }
  }, [open, entry, populateFromEntry]);

  useEffect(() => {
    if (open && seasonId) {
      getUserSeasonCountries(seasonId).then(setExistingCountries);
      getSeasonSeriesNames(seasonId).then(setSeasonSeries);
    }
  }, [open, seasonId]);

  const isNewCountry = useMemo(
    () => !!country && !existingCountries.includes(country),
    [country, existingCountries]
  );

  const scoreBreakdown = useMemo(() => {
    if (pages === 0 && !selectedBook && !entry) return null;
    const bookPages = pages || selectedBook?.pages || 0;
    const parsedPagesRead = pagesRead ? parseInt(pagesRead) || 0 : null;
    const scoringPages = status === "did_not_finish" ? (parsedPagesRead ?? 0) : bookPages;
    const scoringCompleted = status === "completed" || status === "reading";
    return calculateBookScore(
      {
        pages: scoringPages,
        fiction,
        completed: scoringCompleted,
        bonus_1: bonuses[0],
        bonus_2: bonuses[1],
        bonus_3: bonuses[2],
        hometown_bonus: hometownBonus,
        deduction,
        isNewCountry,
      },
      scoringConfig
    );
  }, [pages, fiction, status, pagesRead, bonuses, hometownBonus, deduction, isNewCountry, selectedBook, entry, scoringConfig]);

  function handleBookSelect(book: ParsedBook) {
    setSelectedBook(book);
    setPages(book.pages);
    setCountry(book.country ?? "");
    setDetectedSeries(book.series_name);
    if (book.series_name && !seriesName) {
      setSeriesName(book.series_name);
    }

    if (book.year_published) {
      const year = book.year_published;
      const currentYear = new Date().getFullYear();
      let autoBonus: BonusKey | null = null;
      if (year < 1750) autoBonus = "classics_pre1750";
      else if (year <= 1900) autoBonus = "classics_1750";
      else if (year === currentYear) autoBonus = "current_year";

      if (autoBonus) {
        setBonuses((prev) => {
          const active = prev.filter((k): k is BonusKey => k !== null);
          if (active.includes(autoBonus)) return prev;
          const next = [...prev] as (BonusKey | null)[];
          const emptyIdx = next.findIndex((k) => k === null);
          if (emptyIdx !== -1) next[emptyIdx] = autoBonus;
          return next;
        });
      }
    }
  }

  function resetForm() {
    setSelectedBook(null);
    setPages(0);
    setFiction(true);
    setStatus("completed");
    setPagesRead("");
    setSeriesName("");
    setGenreId(null);
    setGenreName("");
    setDateFinished(new Date().toISOString().split("T")[0]);
    setRating("7");
    setCountry("");
    setBonuses([null, null, null]);
    setHometownBonus(null);
    setDeduction(null);
    setConfirmingDelete(false);
    setDetectedSeries(null);
    setReviewText("");
    setReviewVisibility("private");
    setConfirmingReviewDelete(false);
    setDeletingReview(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSave() {
    if (!seasonId || !currentOrgId) return;

    const finalPages = pages || selectedBook?.pages || entry?.book.pages || 0;
    if (finalPages <= 0) {
      toast.error("Please enter a valid page count.");
      return;
    }

    const parsedPagesRead = pagesRead ? parseInt(pagesRead) || null : null;
    if (status === "did_not_finish" && (!parsedPagesRead || parsedPagesRead <= 0)) {
      toast.error("Please enter how many pages you read.");
      return;
    }

    if (!genreId && !genreName.trim()) {
      toast.error("Please enter a genre.");
      return;
    }

    const parsedRating = rating ? parseFloat(rating) : null;
    if (parsedRating !== null && (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10)) {
      toast.error("Rating must be between 0 and 10.");
      return;
    }

    const isFinished = status === "completed" || status === "did_not_finish";

    setSaving(true);
    try {
      let entryId: string;

      if (isEditMode) {
        await updateBookEntry(entry.id, currentOrgId, seasonId, {
          status,
          fiction,
          seriesName: seriesName || null,
          genreId: genreId || null,
          genreName: genreName || null,
          dateFinished: isFinished ? dateFinished : null,
          rating: parsedRating,
          hometownBonus,
          bonus1: bonuses[0],
          bonus2: bonuses[1],
          bonus3: bonuses[2],
          deduction,
          pages: finalPages,
          pagesRead: status !== "completed" ? parsedPagesRead : null,
          country: country || null,
        });
        entryId = entry.id;
      } else {
        if (!selectedBook) return;
        const bookId = await findOrCreateBook({
          isbn: selectedBook.isbn,
          title: selectedBook.title,
          author: selectedBook.author,
          pages: finalPages,
          year_published: selectedBook.year_published,
          country: country || null,
          cover_url: selectedBook.cover_url,
        });

        entryId = await createBookEntry({
          seasonId,
          orgId: currentOrgId,
          bookId,
          status,
          fiction,
          seriesName: seriesName || null,
          genreId: genreId || null,
          genreName: genreName || null,
          dateFinished: isFinished ? dateFinished : null,
          rating: parsedRating,
          hometownBonus,
          bonus1: bonuses[0],
          bonus2: bonuses[1],
          bonus3: bonuses[2],
          deduction,
          pages: finalPages,
          pagesRead: status !== "completed" ? parsedPagesRead : null,
          country: country || null,
        });
      }

      if (isEntryOwner || !isEditMode) {
        const trimmedReview = reviewText.trim();
        const hadReview = isEditMode && !!entry.review;

        if (trimmedReview) {
          await createOrUpdateReview(entryId, trimmedReview, reviewVisibility);
        } else if (hadReview && entry.review) {
          await deleteReview(entry.review.id, currentOrgId);
        }
      }

      toast.success(isEditMode ? "Book entry updated!" : "Book entry saved!");
      handleClose();
    } catch (err) {
      toast.error(isEditMode ? "Failed to update book entry." : "Failed to save book entry.");
      console.error("Failed to save book entry:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry || !currentOrgId) return;

    setDeleting(true);
    try {
      await deleteBookEntry(entry.id, currentOrgId);
      toast.success("Book entry deleted.");
      handleClose();
    } catch (err) {
      toast.error("Failed to delete book entry.");
      console.error("Failed to delete book entry:", err);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const isMobile = useIsMobile();

  const dialogTitle = isEditMode
    ? entry.book.title
    : "Add a Book";

  const formContent = (
        <div className="space-y-5">
          {isEditMode ? (
            <div className="flex items-start gap-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 p-4 border border-indigo-100/60">
              {entry.book.cover_url ? (
                <img
                  src={entry.book.cover_url}
                  alt={entry.book.title}
                  className="w-14 h-20 object-cover rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-14 h-20 rounded-lg bg-white/60 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-indigo-400" />
                </div>
              )}
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold text-gray-900">{entry.book.title}</p>
                <p className="text-sm text-gray-500">{entry.book.author}</p>
                {entry.book.pages > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{entry.book.pages} pages</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <BookSearch onSelect={handleBookSelect} />
              {selectedBook && (
                <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 p-4 border border-indigo-100/60">
                  {selectedBook.cover_url && (
                    <img src={selectedBook.cover_url} alt="" className="w-10 h-14 object-cover rounded-lg shadow-sm" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{selectedBook.title}</p>
                    <p className="text-sm text-gray-500">{selectedBook.author}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {!readOnly && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 border border-gray-100 space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Reading Status</Label>
              <div role="radiogroup" aria-label="Reading status" className="grid grid-cols-3 gap-1 rounded-lg bg-gray-200/60 p-1">
                {([
                  { value: "reading" as const, label: "Reading" },
                  { value: "completed" as const, label: "Completed" },
                  { value: "did_not_finish" as const, label: "DNF" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={status === opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`rounded-md px-3 py-2.5 md:py-1.5 text-sm font-medium transition-all ${
                      status === opt.value
                        ? opt.value === "reading"
                          ? "bg-amber-500 text-white shadow-sm"
                          : opt.value === "did_not_finish"
                            ? "bg-gray-500 text-white shadow-sm"
                            : "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {status === "completed"
                  ? "Full points with completion bonus"
                  : status === "reading"
                    ? "Points will count once you finish"
                    : "Page points based on pages read, no completion bonus"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pages</Label>
              <Input type="number" min="1" value={pages || ""} onChange={(e) => setPages(Math.max(0, parseInt(e.target.value) || 0))} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={fiction ? "fiction" : "nonfiction"} onValueChange={(v) => setFiction(v === "fiction")} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="nonfiction">Nonfiction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status !== "completed" && (
              <div className="space-y-1.5">
                <Label>Pages Read{status === "did_not_finish" ? " *" : ""}</Label>
                <Input
                  type="number"
                  min="1"
                  max={pages || undefined}
                  value={pagesRead}
                  onChange={(e) => setPagesRead(e.target.value)}
                  placeholder={status === "did_not_finish" ? "Required" : "Optional"}
                  disabled={readOnly}
                />
              </div>
            )}
            {status !== "reading" && (
              <div className="space-y-1.5">
                <Label>Date Finished</Label>
                <Input type="date" value={dateFinished} onChange={(e) => setDateFinished(e.target.value)} disabled={readOnly} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Rating (0-10)</Label>
              <Input type="number" min="0" max="10" step="0.5" value={rating} onChange={(e) => setRating(e.target.value)} disabled={readOnly} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Genre</Label>
            <GenrePicker
              value={genreName}
              onChange={(name, id) => { setGenreName(name); setGenreId(id); }}
              genres={genres}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Series Name (optional)</Label>
            <SeriesPicker
              value={seriesName}
              onChange={setSeriesName}
              seasonSeries={seasonSeries}
              detectedSeries={detectedSeries}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Country (author origin)</Label>
            <CountryPicker value={country} onChange={setCountry} disabled={readOnly} />
          </div>

          {!readOnly && (
            <div className="space-y-4">
              <BonusChips selected={bonuses} onChange={setBonuses} />
              <HometownBonusChips selected={hometownBonus} onChange={setHometownBonus} />
              <DeductionChips selected={deduction} onChange={setDeduction} />
            </div>
          )}

          <ReviewSection
            reviewText={reviewText}
            reviewVisibility={reviewVisibility}
            onReviewTextChange={setReviewText}
            onVisibilityChange={setReviewVisibility}
            canEditReview={isEntryOwner || !isEditMode}
            isAdmin={isAdmin && !isEntryOwner}
            existingReview={entry?.review ?? null}
            orgId={currentOrgId ?? ""}
            onReviewDeleted={() => {
              setReviewText("");
              setConfirmingReviewDelete(false);
            }}
            confirmingDelete={confirmingReviewDelete}
            onConfirmingDeleteChange={setConfirmingReviewDelete}
            deletingReview={deletingReview}
            onDeletingReviewChange={setDeletingReview}
          />

          <div className="sticky bottom-0 bg-background pt-3 pb-[env(safe-area-inset-bottom)] space-y-3 border-t border-gray-100">
            <ScorePreview breakdown={scoreBreakdown} status={status} />

            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={saving || (!isEditMode && !selectedBook)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 md:py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:brightness-95 hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? (isEditMode ? "Updating..." : "Saving...")
                  : (isEditMode ? "Update Book Entry" : "Save Book Entry")}
              </button>
            )}

            {canDelete && isEditMode && (
              confirmingDelete ? (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete Book Entry
                </Button>
              )
            )}
          </div>
        </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)]" showCloseButton={false}>
          <SheetHeader className="px-4 pt-1 pb-0">
            <div className="mx-auto w-10 h-1 rounded-full bg-gray-300 mb-2" />
            <SheetTitle>{dialogTitle}</SheetTitle>
          </SheetHeader>
          <div className="px-4 flex-1 overflow-y-auto">
            {formContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
