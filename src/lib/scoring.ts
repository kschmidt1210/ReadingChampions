import type { ScoringRulesConfig, BonusKey, HometownBonusKey } from "@/types/database";
import type { ScoreInput, ScoreBreakdown, SeasonBonusResult } from "./scoring-types";
import { BONUS_LABELS, DEDUCTION_LABELS } from "./scoring-types";

export function calculateBookScore(
  input: ScoreInput,
  config: ScoringRulesConfig
): ScoreBreakdown {
  // 1. Round pages to nearest 50 (matches spreadsheet MROUND)
  const roundedPages = Math.round(input.pages / 50) * 50;

  // 2. Base points (fiction / nonfiction)
  const basePoints = input.fiction
    ? config.base_points.fiction
    : config.base_points.nonfiction;

  // 3. Page points using rounded pages
  const firstPages = Math.min(roundedPages, 100) * config.page_points.first_100_rate;
  const extraPages = Math.max(roundedPages - 100, 0) * config.page_points.beyond_100_rate;
  const pagePoints = firstPages + extraPages;

  const preBonusTotal = basePoints + pagePoints;

  // 4. Separate new_country from regular bonuses (it's applied post-deduction)
  const regularBonusKeys = [input.bonus_1, input.bonus_2, input.bonus_3].filter(
    (k): k is BonusKey => k !== null && k !== "new_country"
  );

  // 5. Bonuses are zeroed when a deduction is present
  const hasDeduction = input.deduction !== null;

  const bonusAmounts = regularBonusKeys.map((key) => ({
    key,
    label: BONUS_LABELS[key],
    amount: hasDeduction ? 0 : preBonusTotal * config.bonuses[key],
  }));

  let hometownBonusAmount = 0;
  if (input.hometown_bonus && !hasDeduction) {
    hometownBonusAmount =
      preBonusTotal * config.hometown_bonuses[input.hometown_bonus];
  }

  const totalBonuses =
    bonusAmounts.reduce((sum, b) => sum + b.amount, 0) + hometownBonusAmount;
  const postBonusTotal = preBonusTotal + totalBonuses;

  // 6. Deduction multiplier
  let deductionMultiplier = 1;
  let deductionLabel: string | null = null;
  if (input.deduction) {
    deductionMultiplier = config.deductions[input.deduction];
    deductionLabel = DEDUCTION_LABELS[input.deduction];
  }

  const afterDeduction = postBonusTotal * deductionMultiplier;

  // 7. New country multiplier (auto-detected, applied AFTER deduction)
  const newCountryMultiplier = input.isNewCountry
    ? 1 + config.bonuses.new_country
    : 1;
  const finalScore = afterDeduction * newCountryMultiplier;

  return {
    roundedPages,
    basePoints,
    pagePoints,
    preBonusTotal,
    bonusAmounts,
    hometownBonusAmount,
    postBonusTotal,
    deductionMultiplier,
    deductionLabel,
    newCountryMultiplier,
    finalScore,
  };
}

function getFirstLetter(title: string): string {
  const stripped = title
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
  return stripped.charAt(0).toUpperCase();
}

/**
 * Season-level bonuses are a % of the player's sum of PRE-BONUS points
 * (per spec: "% of player's sum of pre-bonus points").
 * Each entry must provide preBonusTotal (base + page points, before
 * bonus multipliers and deductions).
 */
export function calculateSeasonBonuses(
  entries: Array<{ preBonusTotal: number; genre_id: string | null; book: { title: string } }>,
  orgGenreIds: string[],
  config: ScoringRulesConfig
): SeasonBonusResult {
  const totalPreBonus = entries.reduce((sum, e) => sum + e.preBonusTotal, 0);

  // Genre challenge
  const coveredGenres = [...new Set(
    entries.map((e) => e.genre_id).filter((g): g is string => g !== null)
  )];
  const allGenresCovered =
    orgGenreIds.length > 0 &&
    orgGenreIds.every((gid) => coveredGenres.includes(gid));
  const genreCompleteBonus = allGenresCovered
    ? totalPreBonus * config.season_bonuses.genre_complete_pct
    : 0;

  // Alphabet challenge
  const letters = new Set(
    entries.map((e) => getFirstLetter(e.book.title))
  );
  const uniqueLetters = letters.size;
  let alphabetBonus = 0;
  if (uniqueLetters >= 26) {
    alphabetBonus = totalPreBonus * config.season_bonuses.alphabet_26_pct;
  } else if (uniqueLetters >= 13) {
    alphabetBonus = totalPreBonus * config.season_bonuses.alphabet_13_pct;
  }

  const totalSeasonBonus = genreCompleteBonus + alphabetBonus;

  return {
    genreCompleteBonus,
    alphabetBonus,
    uniqueLetters,
    coveredGenres,
    totalSeasonBonus,
  };
}
