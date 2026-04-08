export type Role = "admin" | "player";
export type SeasonStatus = "active" | "archived";

export type BonusKey =
  | "classics_1900"
  | "classics_1750"
  | "classics_pre1750"
  | "series"
  | "translation"
  | "birth_year"
  | "current_year"
  | "holiday_event"
  | "award_winner"
  | "new_country";

export type DeductionKey =
  | "graphic_novel"
  | "comics_manga"
  | "audiobook"
  | "reread"
  | "audiobook_reread";

export type HometownBonusKey = "state_setting" | "state_name" | "city_name";

export type BookEntryStatus = "reading" | "completed" | "did_not_finish";

export interface Profile {
  id: string;
  display_name: string;
  about_text: string | null;
  goodreads_url: string | null;
  storygraph_url: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  invite_code: string;
  spreadsheet_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
}

export interface Season {
  id: string;
  org_id: string;
  name: string;
  status: SeasonStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface Genre {
  id: string;
  org_id: string;
  name: string;
  sort_order: number;
}

export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  author: string;
  pages: number;
  year_published: number | null;
  country: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface BookEntry {
  id: string;
  season_id: string;
  user_id: string;
  book_id: string;
  status: BookEntryStatus;
  fiction: boolean;
  series_name: string | null;
  genre_id: string | null;
  genre_name: string | null;
  date_finished: string | null;
  rating: number | null;
  hometown_bonus: HometownBonusKey | null;
  bonus_1: BonusKey | null;
  bonus_2: BonusKey | null;
  bonus_3: BonusKey | null;
  deduction: DeductionKey | null;
  points: number;
  pages_read: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScoringRulesConfig {
  base_points: { fiction: number; nonfiction: number };
  page_points: { first_100_rate: number; beyond_100_rate: number };
  bonuses: Record<BonusKey, number>;
  hometown_bonuses: Record<HometownBonusKey, number>;
  deductions: Record<DeductionKey, number>;
  season_bonuses: {
    genre_complete_pct: number;
    alphabet_13_pct: number;
    alphabet_26_pct: number;
  };
  longest_road: {
    countries: [number, number, number];
    series: [number, number, number];
  };
}

export interface ScoringRules {
  id: string;
  org_id: string | null;
  config: ScoringRulesConfig;
  updated_at: string;
}

export interface FlaggedEntry {
  id: string;
  book_entry_id: string;
  reason: string;
  resolved: boolean;
  resolved_by: string | null;
  created_at: string;
}

// Joined types for UI convenience
export interface BookEntryWithBook extends BookEntry {
  book: Book;
}

export interface LeaderboardPlayer {
  user_id: string;
  display_name: string;
  total_points: number;
  pending_points: number;
  book_count: number;
  completed_count: number;
  reading_count: number;
  page_count: number;
  rank: number;
  unique_letters: number;
  covered_genre_count: number;
  total_genre_count: number;
  unique_countries: number;
  best_series_pages: number;
  best_series_name: string | null;
  best_series_count: number;
  country_rank: number;
  series_rank: number;
  pre_bonus_total: number;
  country_bonus: number;
  series_bonus: number;
  longest_book_title: string | null;
  longest_book_pages: number;
  avg_book_length: number;
  avg_points_per_book: number;
  highest_point_book_title: string | null;
  highest_point_book_score: number;
  highest_rated_book_title: string | null;
  highest_rated_book_rating: number | null;
}
