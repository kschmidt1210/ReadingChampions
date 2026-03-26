/**
 * Recalculate all book_entries.points using the updated scoring formula.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/recalculate-points.ts
 *
 * Add --dry-run to preview changes without writing to the database.
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

type BonusKey = "classics_1900" | "classics_1750" | "classics_pre1750" | "series" | "translation" | "birth_year" | "current_year" | "holiday_event" | "award_winner" | "new_country";
type DeductionKey = "graphic_novel" | "comics_manga" | "audiobook" | "reread" | "audiobook_reread";
type HometownBonusKey = "state_setting" | "state_name" | "city_name";

interface ScoringRulesConfig {
  base_points: { fiction: number; nonfiction: number };
  page_points: { first_100_rate: number; beyond_100_rate: number };
  bonuses: Record<BonusKey, number>;
  hometown_bonuses: Record<HometownBonusKey, number>;
  deductions: Record<DeductionKey, number>;
  season_bonuses: { genre_complete_pct: number; alphabet_13_pct: number; alphabet_26_pct: number };
  longest_road: { countries: [number, number, number]; series: [number, number, number] };
}

function calculateBookScore(
  input: {
    pages: number;
    fiction: boolean;
    bonus_1: BonusKey | null;
    bonus_2: BonusKey | null;
    bonus_3: BonusKey | null;
    hometown_bonus: HometownBonusKey | null;
    deduction: DeductionKey | null;
  },
  config: ScoringRulesConfig
): number {
  const roundedPages = Math.round(input.pages / 50) * 50;
  const basePoints = input.fiction
    ? config.base_points.fiction
    : config.base_points.nonfiction;
  const pagePoints =
    Math.min(roundedPages, 100) * config.page_points.first_100_rate +
    Math.max(roundedPages - 100, 0) * config.page_points.beyond_100_rate;
  const preBonusTotal = basePoints + pagePoints;

  const allBonusKeys = [input.bonus_1, input.bonus_2, input.bonus_3].filter(
    (k): k is BonusKey => k !== null
  );
  const hasNewCountry = allBonusKeys.includes("new_country");
  const regularBonusKeys = allBonusKeys.filter((k) => k !== "new_country");
  const hasDeduction = input.deduction !== null;

  let totalBonuses = hasDeduction
    ? 0
    : regularBonusKeys.reduce(
        (sum, key) => sum + preBonusTotal * config.bonuses[key],
        0
      );
  if (input.hometown_bonus && !hasDeduction) {
    totalBonuses += preBonusTotal * config.hometown_bonuses[input.hometown_bonus];
  }

  const postBonusTotal = preBonusTotal + totalBonuses;
  const afterDeduction =
    postBonusTotal * (input.deduction ? config.deductions[input.deduction] : 1);
  return afterDeduction * (hasNewCountry ? 1 + config.bonuses.new_country : 1);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (DRY_RUN) console.log("=== DRY RUN (no writes) ===\n");

  // 1. Fetch scoring config (global fallback)
  const { data: scoringRules } = await supabase
    .from("scoring_rules")
    .select("org_id, config")
    .order("org_id", { ascending: true, nullsFirst: false });

  const configByOrg = new Map<string | null, ScoringRulesConfig>();
  for (const rule of scoringRules ?? []) {
    configByOrg.set(rule.org_id, rule.config as ScoringRulesConfig);
  }
  const globalConfig = configByOrg.get(null);

  // 2. Fetch all book entries with book pages
  const { data: entries, error } = await supabase
    .from("book_entries")
    .select("id, fiction, bonus_1, bonus_2, bonus_3, hometown_bonus, deduction, points, book:books(title, pages), season:seasons(org_id)");

  if (error) {
    console.error("Failed to fetch entries:", error.message);
    process.exit(1);
  }
  if (!entries?.length) {
    console.log("No book entries found.");
    return;
  }

  console.log(`Found ${entries.length} book entries to recalculate.\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const entry of entries) {
    const book = entry.book as any;
    const season = entry.season as any;
    const pages: number = book?.pages ?? 0;
    const title: string = book?.title ?? "(unknown)";
    const orgId: string | null = season?.org_id ?? null;

    const config = configByOrg.get(orgId) ?? globalConfig;
    if (!config) {
      console.error(`  [skip] No scoring config for org ${orgId}, entry ${entry.id}`);
      errors++;
      continue;
    }

    const newPoints = calculateBookScore(
      {
        pages,
        fiction: entry.fiction,
        bonus_1: entry.bonus_1 as BonusKey | null,
        bonus_2: entry.bonus_2 as BonusKey | null,
        bonus_3: entry.bonus_3 as BonusKey | null,
        hometown_bonus: entry.hometown_bonus as HometownBonusKey | null,
        deduction: entry.deduction as DeductionKey | null,
      },
      config
    );

    const oldPoints = Number(entry.points);
    const diff = newPoints - oldPoints;

    if (Math.abs(diff) < 0.0001) {
      unchanged++;
      continue;
    }

    const sign = diff > 0 ? "+" : "";
    console.log(
      `  "${title}" (${pages}pp): ${oldPoints.toFixed(4)} → ${newPoints.toFixed(4)} (${sign}${diff.toFixed(4)})`
    );

    if (!DRY_RUN) {
      const { error: updateErr } = await supabase
        .from("book_entries")
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq("id", entry.id);

      if (updateErr) {
        console.error(`    [error] ${updateErr.message}`);
        errors++;
        continue;
      }
    }

    updated++;
  }

  console.log(
    `\nDone! ${updated} updated, ${unchanged} unchanged, ${errors} errors.${DRY_RUN ? " (dry run — no writes)" : ""}`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
