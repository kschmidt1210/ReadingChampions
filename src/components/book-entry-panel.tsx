"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { BookOpen, Calendar, ChevronDown, Lock, Globe, MessageSquareText, Trash2, EyeOff, X, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

export interface ManagedPlayerOption {
  userId: string;
  displayName: string;
}

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
  managedPlayers?: ManagedPlayerOption[];
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
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Review</span>
          {existingReview.visibility === "private" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
              <Lock className="h-3 w-3" />
              Private
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
              <Globe className="h-3 w-3" />
              Public
            </span>
          )}
        </div>
        <div className="px-4 pb-3 border-t border-border pt-3">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {existingReview.review_text}
          </p>
        </div>
        {isAdmin && existingReview.visibility === "public" && (
          <div className="px-4 pb-3 flex gap-2 border-t border-border pt-3">
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
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted active:bg-muted transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          {hasReview ? "Review" : "Write a review"}
          {hasReview && (
            <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-xs font-semibold">
              {reviewVisibility === "public" ? "Public" : "Private"}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <textarea
              value={reviewText}
              onChange={(e) => onReviewTextChange(e.target.value)}
              placeholder="What did you think of this book?"
              maxLength={5000}
              rows={4}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-colors resize-y min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {reviewText.length.toLocaleString()} / 5,000
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Visibility</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
              <button
                type="button"
                onClick={() => onVisibilityChange("private")}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 md:py-1.5 text-sm font-medium transition-all ${
                  reviewVisibility === "private"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Public
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
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
  managedPlayers = [],
}: BookEntryPanelProps) {
  const { currentOrgId } = useOrg();
  const isEditMode = !!entry;
  const readOnly = isEditMode && !canEdit;
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const hasManagedPlayers = managedPlayers.length > 0 && !isEditMode;

  const [selectedBook, setSelectedBook] = useState<ParsedBook | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [pages, setPages] = useState(0);
  const [fiction, setFiction] = useState(true);
  const [status, setStatus] = useState<BookEntryStatus>("completed");
  const [pagesRead, setPagesRead] = useState<string>("");
  const [seriesName, setSeriesName] = useState("");
  const [genreId, setGenreId] = useState<string | null>(null);
  const [genreName, setGenreName] = useState("");
  const [dateFinished, setDateFinished] = useState(new Date().toISOString().split("T")[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);
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
      getUserSeasonCountries(seasonId, targetUserId ?? undefined).then(setExistingCountries);
      getSeasonSeriesNames(seasonId).then(setSeasonSeries);
    }
  }, [open, seasonId, targetUserId]);

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

  function handleBookClear() {
    setSelectedBook(null);
    setPages(0);
    setCountry("");
    setDetectedSeries(null);
    setSeriesName("");
    setBonuses([null, null, null]);
    setManualTitle("");
    setManualAuthor("");
  }

  function resetForm() {
    setSelectedBook(null);
    setManualTitle("");
    setManualAuthor("");
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
    setTargetUserId(null);
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

    const bookTitle = selectedBook?.title || manualTitle.trim();
    const bookAuthorName = selectedBook?.author || manualAuthor.trim() || "Unknown";

    if (!isEditMode && !bookTitle) {
      toast.error("Please search for a book or enter a title.");
      return;
    }

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
        const bookId = await findOrCreateBook({
          isbn: selectedBook?.isbn ?? null,
          title: bookTitle,
          author: bookAuthorName,
          pages: finalPages,
          year_published: selectedBook?.year_published ?? null,
          country: country || null,
          cover_url: selectedBook?.cover_url ?? null,
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
          onBehalfOfUserId: targetUserId ?? undefined,
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

  const selectedPlayerName = targetUserId
    ? managedPlayers.find((p) => p.userId === targetUserId)?.displayName
    : null;

  const dialogTitle = isEditMode
    ? entry.book.title
    : selectedPlayerName
      ? `Add a Book for ${selectedPlayerName}`
      : "Add a Book";

  const hasSearchResult = !!selectedBook;

  const managedPlayerPicker = hasManagedPlayers ? (
    <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/60 dark:border-amber-800/40 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Logging for</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTargetUserId(null)}
          className={`rounded-lg px-3 py-2 md:py-1.5 text-sm font-medium transition-all ${
            !targetUserId
              ? "bg-card text-foreground shadow-sm ring-1 ring-amber-300 dark:ring-amber-600"
              : "text-amber-700 dark:text-amber-300 hover:bg-card/50"
          }`}
        >
          Myself
        </button>
        {managedPlayers.map((mp) => (
          <button
            key={mp.userId}
            type="button"
            onClick={() => setTargetUserId(mp.userId)}
            className={`rounded-lg px-3 py-2 md:py-1.5 text-sm font-medium transition-all ${
              targetUserId === mp.userId
                ? "bg-card text-foreground shadow-sm ring-1 ring-amber-300 dark:ring-amber-600"
                : "text-amber-700 dark:text-amber-300 hover:bg-card/50"
            }`}
          >
            {mp.displayName}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const statusSection = !readOnly ? (
    <div className="rounded-xl bg-muted px-4 py-3 border border-border space-y-1.5">
      <Label className="text-sm font-medium text-foreground">Reading Status</Label>
      <div role="radiogroup" aria-label="Reading status" className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
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
                    : "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {status === "completed"
          ? "Full points with completion bonus"
          : status === "reading"
            ? "Points will count once you finish"
            : "Page points based on pages read, no completion bonus"}
      </p>
    </div>
  ) : null;

  const bookDetailsSection = (
    <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Book Details</p>
      {!isEditMode && !hasSearchResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Book title"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Author</Label>
            <Input
              value={manualAuthor}
              onChange={(e) => setManualAuthor(e.target.value)}
              placeholder="Author name (optional)"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 [&>div]:min-w-0">
        <div className="space-y-1.5">
          <Label>Pages</Label>
          <Input type="number" min="1" value={pages || ""} onChange={(e) => setPages(Math.max(0, parseInt(e.target.value) || 0))} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1 min-h-11 md:min-h-8">
            <button
              type="button"
              onClick={() => !readOnly && setFiction(true)}
              disabled={readOnly}
              className={`rounded-md text-sm font-medium transition-all ${
                fiction
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              } disabled:opacity-50`}
            >
              Fiction
            </button>
            <button
              type="button"
              onClick={() => !readOnly && setFiction(false)}
              disabled={readOnly}
              className={`rounded-md text-sm font-medium transition-all ${
                !fiction
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              } disabled:opacity-50`}
            >
              Nonfiction
            </button>
          </div>
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
            <div className="relative">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  try { dateInputRef.current?.showPicker(); } catch { dateInputRef.current?.focus(); }
                }}
                className="flex w-full items-center justify-between min-h-11 md:min-h-8 rounded-lg border border-input bg-transparent px-2.5 py-2 md:py-1 text-base md:text-sm text-left transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
              >
                <span>{dateFinished ? format(parseISO(dateFinished), "MMM d, yyyy") : "Select date"}</span>
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={dateFinished}
                onChange={(e) => setDateFinished(e.target.value)}
                disabled={readOnly}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
              />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Rating (0-10)</Label>
          <Input type="number" min="0" max="10" step="0.01" value={rating} onChange={(e) => setRating(e.target.value)} disabled={readOnly} />
        </div>
      </div>
    </div>
  );

  const classificationSection = (
    <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Classification</p>
      <div className="space-y-4">
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
      </div>
    </div>
  );

  const scoringModifiersSection = !readOnly ? (
    <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scoring Modifiers</p>
      <BonusChips selected={bonuses} onChange={setBonuses} />
      <HometownBonusChips selected={hometownBonus} onChange={setHometownBonus} />
      <DeductionChips selected={deduction} onChange={setDeduction} />
    </div>
  ) : null;

  const reviewSection = (
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
  );

  const actionButtons = (
    <div className="space-y-3">
      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={saving || (!isEditMode && !selectedBook && !manualTitle.trim())}
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
  );

  const formFields = (
    <div className="space-y-5">
      {statusSection}
      {bookDetailsSection}
      {classificationSection}
      {scoringModifiersSection}
      {reviewSection}
      {actionButtons}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent side="bottom" className="max-h-[95dvh] flex flex-col rounded-t-2xl" showCloseButton={false}>
          <SheetHeader className="px-4 pt-1 pb-0">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
            <div className="flex items-center justify-between">
              <SheetTitle>{dialogTitle}</SheetTitle>
              <SheetClose className="rounded-full p-2 -mr-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted active:bg-muted transition-colors">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>
          </SheetHeader>
          <div className="px-4 flex-1 overflow-y-auto">
            <div className="space-y-5 pb-4">
              {managedPlayerPicker}

              {isEditMode ? (
              <div className="flex items-start gap-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 p-4 border border-indigo-100/60 dark:border-indigo-800/40">
                {entry.book.cover_url ? (
                  <img
                    src={entry.book.cover_url}
                    alt={entry.book.title}
                    className="w-14 h-20 object-cover rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-20 rounded-lg bg-card/60 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-indigo-400" />
                  </div>
                )}
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold text-foreground">{entry.book.title}</p>
                  <p className="text-sm text-muted-foreground">{entry.book.author}</p>
                  {entry.book.pages > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{entry.book.pages} pages</p>
                  )}
                </div>
              </div>
            ) : (
              <BookSearch
                onSelect={handleBookSelect}
                selectedBook={selectedBook}
                onClear={handleBookClear}
              />
            )}

            {formFields}

            <div className="sticky bottom-0 bg-background pt-3 pb-[env(safe-area-inset-bottom)] border-t border-border">
                <ScorePreview breakdown={scoreBreakdown} status={status} />
              </div>
            </div>
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
          <div className="space-y-5 pb-2">
            {managedPlayerPicker}

            {isEditMode ? (
              <div className="flex items-start gap-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 p-4 border border-indigo-100/60 dark:border-indigo-800/40">
                {entry.book.cover_url ? (
                  <img
                    src={entry.book.cover_url}
                    alt={entry.book.title}
                    className="w-14 h-20 object-cover rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-20 rounded-lg bg-card/60 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-indigo-400" />
                  </div>
                )}
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold text-foreground">{entry.book.title}</p>
                  <p className="text-sm text-muted-foreground">{entry.book.author}</p>
                  {entry.book.pages > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{entry.book.pages} pages</p>
                  )}
                </div>
              </div>
            ) : (
              <BookSearch
                onSelect={handleBookSelect}
                selectedBook={selectedBook}
                onClear={handleBookClear}
              />
            )}

            {formFields}
          </div>
          <div className="sticky bottom-0 bg-background pt-3 border-t border-border">
            <ScorePreview breakdown={scoreBreakdown} status={status} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
