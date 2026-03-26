import { calculateBookScore, calculateSeasonBonuses } from "../scoring";
import type { ScoringRulesConfig } from "@/types/database";
import type { ScoreInput } from "../scoring-types";

const DEFAULT_CONFIG: ScoringRulesConfig = {
  base_points: { fiction: 0.71, nonfiction: 1.26 },
  page_points: { first_100_rate: 0.0028, beyond_100_rate: 0.01 },
  bonuses: {
    classics_1900: 0.072,
    classics_1750: 0.143,
    classics_pre1750: 0.286,
    series: 0.143,
    translation: 0.057,
    birth_year: 0.029,
    current_year: 0.057,
    holiday_event: 0.029,
    award_winner: 0.057,
    new_country: 0.057,
  },
  hometown_bonuses: {
    state_setting: 0.029,
    state_name: 0.0029,
    city_name: 0.0058,
  },
  deductions: {
    graphic_novel: 0.3,
    comics_manga: 0.2,
    audiobook: 0.75,
    reread: 0.5,
    audiobook_reread: 0.25,
  },
  season_bonuses: {
    genre_complete_pct: 0.10,
    alphabet_13_pct: 0.06,
    alphabet_26_pct: 0.14,
  },
  longest_road: {
    countries: [10, 7, 4],
    series: [8, 5, 3],
  },
};

describe("calculateBookScore", () => {
  it("calculates base score for fiction with no bonuses", () => {
    const input: ScoreInput = {
      pages: 300,
      fiction: true,
      bonus_1: null,
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: null,
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71
    // Pages: min(300,100)*0.0028 + max(300-100,0)*0.01 = 0.28 + 2.0 = 2.28
    // Total: 0.71 + 2.28 = 2.99
    expect(result.finalScore).toBeCloseTo(2.99, 2);
    expect(result.basePoints).toBeCloseTo(0.71, 2);
    expect(result.pagePoints).toBeCloseTo(2.28, 2);
  });

  it("calculates base score for nonfiction", () => {
    const input: ScoreInput = {
      pages: 50,
      fiction: false,
      bonus_1: null,
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: null,
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 1.26, Pages: 50*0.0028 = 0.14, Total: 1.40
    expect(result.finalScore).toBeCloseTo(1.40, 2);
  });

  it("applies bonus multipliers correctly", () => {
    const input: ScoreInput = {
      pages: 200,
      fiction: true,
      bonus_1: "series",
      bonus_2: "award_winner",
      bonus_3: null,
      hometown_bonus: "state_setting",
      deduction: null,
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71, Pages: 0.28 + 1.0 = 1.28, PreBonus: 1.99
    // Series: 1.99 * 0.143 = 0.28457
    // Award: 1.99 * 0.057 = 0.11343
    // Hometown: 1.99 * 0.029 = 0.05771
    // Total: 1.99 + 0.28457 + 0.11343 + 0.05771 = 2.44571
    expect(result.finalScore).toBeCloseTo(2.4457, 2);
    expect(result.bonusAmounts.length).toBe(2);
  });

  it("applies deduction multiplier", () => {
    const input: ScoreInput = {
      pages: 100,
      fiction: true,
      bonus_1: null,
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: "audiobook",
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71, Pages: 0.28, PreBonus: 0.99
    // Deduction: 0.99 * 0.75 = 0.7425
    expect(result.finalScore).toBeCloseTo(0.7425, 2);
    expect(result.deductionMultiplier).toBe(0.75);
  });

  it("applies bonuses then deduction", () => {
    const input: ScoreInput = {
      pages: 400,
      fiction: true,
      bonus_1: "classics_pre1750",
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: "reread",
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71, Pages: 0.28 + 3.0 = 3.28, PreBonus: 3.99
    // Classics bonus: 3.99 * 0.286 = 1.14114
    // PostBonus: 3.99 + 1.14114 = 5.13114
    // Deduction: 5.13114 * 0.5 = 2.56557
    expect(result.finalScore).toBeCloseTo(2.5656, 2);
  });
});

// Helper to create minimal entries for season bonus testing
function makeSeasonEntry(overrides: {
  genre_id?: string | null;
  book_title?: string;
  preBonusTotal?: number;
}) {
  return {
    preBonusTotal: overrides.preBonusTotal ?? 2.0,
    genre_id: overrides.genre_id ?? null,
    book: { title: overrides.book_title ?? "Test Book" },
  };
}

describe("calculateSeasonBonuses", () => {
  it("returns genre complete bonus when all genres covered", () => {
    const genres = ["g1", "g2", "g3"];
    const entries = genres.map((gid) =>
      makeSeasonEntry({ genre_id: gid, preBonusTotal: 2 })
    );
    const result = calculateSeasonBonuses(entries, genres, DEFAULT_CONFIG);
    // Sum of preBonusTotal = 6, genre complete = 6 * 0.10 = 0.6
    expect(result.genreCompleteBonus).toBeCloseTo(0.6, 2);
  });

  it("returns zero genre bonus when incomplete", () => {
    const genres = ["g1", "g2", "g3"];
    const entries = [makeSeasonEntry({ genre_id: "g1", preBonusTotal: 2 })];
    const result = calculateSeasonBonuses(entries, genres, DEFAULT_CONFIG);
    expect(result.genreCompleteBonus).toBe(0);
  });

  it("calculates alphabet challenge 13+ letters", () => {
    // Use titles like "Bat", "Cat", etc. to avoid article stripping on "A"
    const letters = "BCDEFGHIJKLMN";
    const entries = letters.split("").map((letter) =>
      makeSeasonEntry({ book_title: `${letter}ook`, preBonusTotal: 1 })
    );
    const result = calculateSeasonBonuses(entries, [], DEFAULT_CONFIG);
    // 13 entries, each preBonusTotal=1, total=13. 13 letters = +6%: 13 * 0.06 = 0.78
    expect(result.alphabetBonus).toBeCloseTo(0.78, 2);
    expect(result.uniqueLetters).toBe(13);
  });

  it("calculates alphabet challenge all 26 letters", () => {
    // Avoid "A <word>" being stripped as article; use "Alpha", "Bravo", etc.
    const titles = [
      "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot",
      "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike",
      "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra",
      "Tango", "Uniform", "Victor", "Whiskey", "Xray", "Yankee", "Zulu",
    ];
    const entries = titles.map((t) =>
      makeSeasonEntry({ book_title: t, preBonusTotal: 1 })
    );
    const result = calculateSeasonBonuses(entries, [], DEFAULT_CONFIG);
    // 26 entries, each preBonusTotal=1, total=26. 26 letters = +14%: 26 * 0.14 = 3.64
    expect(result.alphabetBonus).toBeCloseTo(3.64, 2);
    expect(result.uniqueLetters).toBe(26);
  });

  it("strips leading articles for alphabet challenge", () => {
    const entries = [
      makeSeasonEntry({ book_title: "The Amazing Race", preBonusTotal: 1 }),
      makeSeasonEntry({ book_title: "A Bright Day", preBonusTotal: 1 }),
      makeSeasonEntry({ book_title: "An Elephant", preBonusTotal: 1 }),
    ];
    const result = calculateSeasonBonuses(entries, [], DEFAULT_CONFIG);
    // "The Amazing" -> A, "A Bright" -> B, "An Elephant" -> E = 3 letters
    expect(result.uniqueLetters).toBe(3);
  });
});
