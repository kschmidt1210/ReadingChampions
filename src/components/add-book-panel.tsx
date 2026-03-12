"use client";

import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookSearch } from "./book-search";
import { ScorePreview } from "./score-preview";
import { BonusChips } from "./bonus-chips";
import { DeductionChips } from "./deduction-chips";
import { HOMETOWN_BONUS_LABELS } from "@/lib/scoring-types";
import { calculateBookScore } from "@/lib/scoring";
import { useOrg } from "./providers";
import { findOrCreateBook, createBookEntry } from "@/lib/actions/books";
import type { ParsedBook } from "@/lib/books-api";
import type { BonusKey, DeductionKey, HometownBonusKey, ScoringRulesConfig } from "@/types/database";

// Default config for client-side preview (matches seed data)
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

interface AddBookPanelProps {
  open: boolean;
  onClose: () => void;
  genres?: Array<{ id: string; name: string }>;
  seasonId?: string;
  scoringConfig?: ScoringRulesConfig;
}

export function AddBookPanel({
  open,
  onClose,
  genres = [],
  seasonId,
  scoringConfig = DEFAULT_SCORING_CONFIG,
}: AddBookPanelProps) {
  const { currentOrgId } = useOrg();
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

  // Live score preview
  const scoreBreakdown = useMemo(() => {
    if (pages === 0 && !selectedBook) return null;
    return calculateBookScore(
      {
        pages: pages || selectedBook?.pages || 0,
        fiction,
        bonus_1: bonuses[0],
        bonus_2: bonuses[1],
        bonus_3: bonuses[2],
        hometown_bonus: hometownBonus,
        deduction,
      },
      scoringConfig
    );
  }, [pages, fiction, bonuses, hometownBonus, deduction, selectedBook, scoringConfig]);

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
  }

  async function handleSave() {
    if (!selectedBook || !seasonId || !currentOrgId) return;
    setSaving(true);
    try {
      const bookId = await findOrCreateBook({
        isbn: selectedBook.isbn,
        title: selectedBook.title,
        author: selectedBook.author,
        pages: pages || selectedBook.pages,
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
        rating: rating ? parseFloat(rating) : null,
        hometownBonus,
        bonus1: bonuses[0],
        bonus2: bonuses[1],
        bonus3: bonuses[2],
        deduction,
        pages: pages || selectedBook.pages,
      });

      resetForm();
      onClose();
    } catch (err) {
      console.error("Failed to save book entry:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add a Book</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4">
          {/* Search */}
          <BookSearch onSelect={handleBookSelect} />

          {/* Book details */}
          {selectedBook && (
            <>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-semibold">{selectedBook.title}</p>
                <p className="text-sm text-gray-500">{selectedBook.author}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Pages</Label>
                  <Input type="number" value={pages} onChange={(e) => setPages(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={fiction ? "fiction" : "nonfiction"} onValueChange={(v) => setFiction(v === "fiction")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fiction">Fiction</SelectItem>
                      <SelectItem value="nonfiction">Nonfiction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date Finished</Label>
                  <Input type="date" value={dateFinished} onChange={(e) => setDateFinished(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rating (0-10)</Label>
                  <Input type="number" min="0" max="10" step="0.5" value={rating} onChange={(e) => setRating(e.target.value)} />
                </div>
              </div>

              {genres.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Genre</Label>
                  <Select value={genreId} onValueChange={(v) => setGenreId(v ?? "")}>
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
                <Input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} placeholder="e.g., Lord of the Rings" />
              </div>

              <div className="space-y-1.5">
                <Label>Country (author origin)</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., United States" />
              </div>

              {/* Bonuses */}
              <BonusChips selected={bonuses} onChange={setBonuses} />

              {/* Hometown bonus */}
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

              {/* Deductions */}
              <DeductionChips selected={deduction} onChange={setDeduction} />

              {/* Live score */}
              <div className="sticky bottom-0 bg-white pt-2">
                <ScorePreview breakdown={scoreBreakdown} />
                <Button onClick={handleSave} className="w-full mt-3" disabled={saving}>
                  {saving ? "Saving..." : "Save Book Entry"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
