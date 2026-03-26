import type { ScoringRulesConfig, BonusKey, HometownBonusKey } from "@/types/database";
import type { ScoreInput, ScoreBreakdown, SeasonBonusResult } from "./scoring-types";
import { BONUS_LABELS, DEDUCTION_LABELS } from "./scoring-types";

export function calculateBookScore(
  input: ScoreInput,
  config: ScoringRulesConfig
): ScoreBreakdown {
  // 1. Base points
  const basePoints = input.fiction
    ? config.base_points.fiction
    : config.base_points.nonfiction;

  // 2. Page points
  const firstPages = Math.min(input.pages, 100) * config.page_points.first_100_rate;
  const extraPages = Math.max(input.pages - 100, 0) * config.page_points.beyond_100_rate;
  const pagePoints = firstPages + extraPages;

  // 3. Pre-bonus total
  const preBonusTotal = basePoints + pagePoints;

  // 4. Bonus multipliers
  const bonusKeys = [input.bonus_1, input.bonus_2, input.bonus_3].filter(
    (k): k is BonusKey => k !== null
  );

  const bonusAmounts = bonusKeys.map((key) => ({
    key,
    label: BONUS_LABELS[key],
    amount: preBonusTotal * config.bonuses[key],
  }));

  // Hometown bonus
  let hometownBonusAmount = 0;
  if (input.hometown_bonus) {
    hometownBonusAmount =
      preBonusTotal * config.hometown_bonuses[input.hometown_bonus];
  }

  const totalBonuses =
    bonusAmounts.reduce((sum, b) => sum + b.amount, 0) + hometownBonusAmount;
  const postBonusTotal = preBonusTotal + totalBonuses;

  // 5. Deduction multiplier
  let deductionMultiplier = 1;
  let deductionLabel: string | null = null;
  if (input.deduction) {
    deductionMultiplier = config.deductions[input.deduction];
    deductionLabel = DEDUCTION_LABELS[input.deduction];
  }

  const finalScore = postBonusTotal * deductionMultiplier;

  return {
    basePoints,
    pagePoints,
    preBonusTotal,
    bonusAmounts,
    hometownBonusAmount,
    postBonusTotal,
    deductionMultiplier,
    deductionLabel,
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
