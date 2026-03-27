import type { BonusKey, DeductionKey, HometownBonusKey } from "@/types/database";

export const BONUS_LABELS: Record<BonusKey, string> = {
  classics_1900: "Classics (1900-Present)",
  classics_1750: "1750-1900",
  classics_pre1750: "Before 1750",
  series: "Series",
  translation: "Translation",
  birth_year: "Birth Year",
  current_year: "Current Year",
  holiday_event: "Relatable Holiday/Event",
  award_winner: "Award Winner",
  new_country: "New (Unique) Country",
};

export const DEDUCTION_LABELS: Record<DeductionKey, string> = {
  graphic_novel: "Graphic Novel",
  comics_manga: "Comics / Manga",
  audiobook: "Audiobook",
  reread: "Re-read",
  audiobook_reread: "Audiobook Re-read",
};

export const HOMETOWN_BONUS_LABELS: Record<HometownBonusKey, string> = {
  state_setting: "Set in Florida / My State",
  state_name: '"Florida" / "Hometown State" in title',
  city_name: '"Tampa" / "Hometown City" in title',
};

export interface ScoreInput {
  pages: number;
  fiction: boolean;
  bonus_1: BonusKey | null;
  bonus_2: BonusKey | null;
  bonus_3: BonusKey | null;
  hometown_bonus: HometownBonusKey | null;
  deduction: DeductionKey | null;
  isNewCountry: boolean;
}

export interface SeasonBonusResult {
  genreCompleteBonus: number;
  alphabetBonus: number;
  uniqueLetters: number;
  coveredGenres: string[];
  totalSeasonBonus: number;
}

export interface ScoreBreakdown {
  roundedPages: number;
  basePoints: number;
  pagePoints: number;
  preBonusTotal: number;
  bonusAmounts: { key: string; label: string; amount: number }[];
  hometownBonusAmount: number;
  postBonusTotal: number;
  deductionMultiplier: number;
  deductionLabel: string | null;
  newCountryMultiplier: number;
  finalScore: number;
}
