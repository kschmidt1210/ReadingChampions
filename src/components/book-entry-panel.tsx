"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookSearch } from "./book-search";
import { ScorePreview } from "./score-preview";
import { BonusChips } from "./bonus-chips";
import { DeductionChips } from "./deduction-chips";
import { Switch } from "@/components/ui/switch";
import { HOMETOWN_BONUS_LABELS } from "@/lib/scoring-types";
import { calculateBookScore } from "@/lib/scoring";
import { useOrg } from "./providers";
import { findOrCreateBook, createBookEntry, updateBookEntry, deleteBookEntry, getUserSeasonCountries } from "@/lib/actions/books";
import { toast } from "sonner";
import type { ParsedBook } from "@/lib/books-api";
import type { BookEntryWithBook, BonusKey, DeductionKey, HometownBonusKey, ScoringRulesConfig } from "@/types/database";

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
}: BookEntryPanelProps) {
  const { currentOrgId } = useOrg();
  const isEditMode = !!entry;
  const readOnly = isEditMode && !canEdit;

  const [selectedBook, setSelectedBook] = useState<ParsedBook | null>(null);
  const [pages, setPages] = useState(0);
  const [fiction, setFiction] = useState(true);
  const [completed, setCompleted] = useState(true);
  const [seriesName, setSeriesName] = useState("");
  const [genreId, setGenreId] = useState<string>("");
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

  const populateFromEntry = useCallback((e: BookEntryWithBook) => {
    setPages(e.book.pages);
    setFiction(e.fiction);
    setCompleted(e.completed);
    setSeriesName(e.series_name ?? "");
    setGenreId(e.genre_id ?? "");
    setDateFinished(e.date_finished ?? new Date().toISOString().split("T")[0]);
    setRating(e.rating !== null ? String(e.rating) : "");
    setCountry(e.book.country ?? "");
    setBonuses([e.bonus_1, e.bonus_2, e.bonus_3]);
    setHometownBonus(e.hometown_bonus);
    setDeduction(e.deduction);
  }, []);

  useEffect(() => {
    if (open && entry) {
      populateFromEntry(entry);
    }
  }, [open, entry, populateFromEntry]);

  useEffect(() => {
    if (open && seasonId) {
      getUserSeasonCountries(seasonId).then(setExistingCountries);
    }
  }, [open, seasonId]);

  const isNewCountry = useMemo(
    () => !!country && !existingCountries.includes(country),
    [country, existingCountries]
  );

  const scoreBreakdown = useMemo(() => {
    if (pages === 0 && !selectedBook && !entry) return null;
    return calculateBookScore(
      {
        pages: pages || selectedBook?.pages || 0,
        fiction,
        completed,
        bonus_1: bonuses[0],
        bonus_2: bonuses[1],
        bonus_3: bonuses[2],
        hometown_bonus: hometownBonus,
        deduction,
        isNewCountry,
      },
      scoringConfig
    );
  }, [pages, fiction, completed, bonuses, hometownBonus, deduction, isNewCountry, selectedBook, entry, scoringConfig]);

  function handleBookSelect(book: ParsedBook) {
    setSelectedBook(book);
    setPages(book.pages);
    setCountry(book.country ?? "");
  }

  function resetForm() {
    setSelectedBook(null);
    setPages(0);
    setFiction(true);
    setCompleted(true);
    setSeriesName("");
    setGenreId("");
    setDateFinished(new Date().toISOString().split("T")[0]);
    setRating("7");
    setCountry("");
    setBonuses([null, null, null]);
    setHometownBonus(null);
    setDeduction(null);
    setConfirmingDelete(false);
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

    const parsedRating = rating ? parseFloat(rating) : null;
    if (parsedRating !== null && (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10)) {
      toast.error("Rating must be between 0 and 10.");
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await updateBookEntry(entry.id, currentOrgId, seasonId, {
          completed,
          fiction,
          seriesName: seriesName || null,
          genreId: genreId || null,
          dateFinished: completed ? dateFinished : null,
          rating: parsedRating,
          hometownBonus,
          bonus1: bonuses[0],
          bonus2: bonuses[1],
          bonus3: bonuses[2],
          deduction,
          pages: finalPages,
          country: country || null,
        });
        toast.success("Book entry updated!");
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

        await createBookEntry({
          seasonId,
          orgId: currentOrgId,
          bookId,
          completed,
          fiction,
          seriesName: seriesName || null,
          genreId: genreId || null,
          dateFinished: completed ? dateFinished : null,
          rating: parsedRating,
          hometownBonus,
          bonus1: bonuses[0],
          bonus2: bonuses[1],
          bonus3: bonuses[2],
          deduction,
          pages: finalPages,
          country: country || null,
        });
        toast.success("Book entry saved!");
      }
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

  const dialogTitle = isEditMode
    ? entry.book.title
    : "Add a Book";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 overflow-y-auto pr-1">
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
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
              <div>
                <Label htmlFor="completed-toggle" className="text-sm font-medium text-gray-700">Finished reading?</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  {completed ? "Full points with base score" : "Page points only until completed"}
                </p>
              </div>
              <Switch
                id="completed-toggle"
                checked={completed}
                onCheckedChange={setCompleted}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{completed ? "Pages" : "Pages Read"}</Label>
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
            {completed && (
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

          {genres.length > 0 && (
            <div className="space-y-1.5">
              <Label>Genre</Label>
              <Select value={genreId} onValueChange={(v) => setGenreId(v ?? "")} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Select genre..." /></SelectTrigger>
                <SelectContent>
                  {genres.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Series Name (optional)</Label>
            <Input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} placeholder="e.g., Lord of the Rings" disabled={readOnly} />
          </div>

          <div className="space-y-1.5">
            <Label>Country (author origin)</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., United States" disabled={readOnly} />
          </div>

          {readOnly ? null : (
            <>
              <BonusChips selected={bonuses} onChange={setBonuses} />

              <div className="space-y-1.5">
                <Label>Hometown Bonus</Label>
                <Select value={hometownBonus ?? "none"} onValueChange={(v) => setHometownBonus(v === "none" ? null : v as HometownBonusKey)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Object.entries(HOMETOWN_BONUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DeductionChips selected={deduction} onChange={setDeduction} />
            </>
          )}

          <div className="sticky bottom-0 bg-background pt-3 space-y-3 border-t border-gray-100">
            <ScorePreview breakdown={scoreBreakdown} completed={completed} />

            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={saving || (!isEditMode && !selectedBook)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </DialogContent>
    </Dialog>
  );
}
