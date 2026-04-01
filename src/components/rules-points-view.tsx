"use client";

import { useState, useTransition } from "react";
import {
  Pencil,
  Save,
  X,
  BookOpen,
  Calculator,
  Star,
  Home,
  TrendingDown,
  Trophy,
  Globe,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateOrgNotes } from "@/lib/actions/admin";
import type { ScoringRulesConfig } from "@/types/database";
import { BONUS_LABELS, DEDUCTION_LABELS, HOMETOWN_BONUS_LABELS } from "@/lib/scoring-types";
import type { BonusKey, DeductionKey, HometownBonusKey } from "@/types/database";

function PointRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${className ?? ""}`}>
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}

function NotesSection({
  orgId,
  notes,
  isAdmin,
}: {
  orgId: string;
  notes: string | null;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateOrgNotes(orgId, draft);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to save notes");
      } else {
        setSaved(draft || null);
        setEditing(false);
        toast.success("Notes updated");
      }
    });
  }

  function handleCancel() {
    setDraft(saved ?? "");
    setEditing(false);
  }

  if (!isAdmin && !saved) return null;

  return (
    <Card className="border-indigo-200/60 bg-gradient-to-br from-indigo-50/50 to-violet-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <StickyNote className="h-4.5 w-4.5 text-indigo-500" />
            Notes
          </CardTitle>
          {isAdmin && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add notes about rules, tips, or announcements for players..."
              rows={5}
              className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-y"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : saved ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {saved}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No notes yet. Click Edit to add announcements or tips for players.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function RulesPointsView({
  orgId,
  config,
  notes,
  isAdmin,
}: {
  orgId: string;
  config: ScoringRulesConfig;
  notes: string | null;
  isAdmin: boolean;
}) {
  const regularBonusKeys = (
    Object.keys(config.bonuses) as BonusKey[]
  ).filter((k) => k !== "new_country");

  return (
    <div className="space-y-5">
      <NotesSection orgId={orgId} notes={notes} isAdmin={isAdmin} />

      {/* Base Points */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4.5 w-4.5 text-emerald-500" />
            Base Points
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Awarded for each completed book
          </p>
        </CardHeader>
        <CardContent className="text-sm divide-y divide-gray-100">
          <PointRow
            label="Fiction"
            value={`${config.base_points.fiction} pts`}
          />
          <PointRow
            label="Nonfiction"
            value={`${config.base_points.nonfiction} pts`}
          />
          <div className="pt-2 text-xs text-gray-400">
            Incomplete books receive page points only (no base points).
          </div>
        </CardContent>
      </Card>

      {/* Page Points */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4.5 w-4.5 text-blue-500" />
            Page Points
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Pages are rounded to the nearest 50
          </p>
        </CardHeader>
        <CardContent className="text-sm divide-y divide-gray-100">
          <PointRow
            label="First 100 pages"
            value={`${config.page_points.first_100_rate} pts/page`}
          />
          <PointRow
            label="Beyond 100 pages"
            value={`${config.page_points.beyond_100_rate} pts/page`}
          />
          <div className="pt-3 mt-1">
            <p className="text-xs font-medium text-gray-500 mb-2">Example</p>
            <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600 space-y-1">
              <p>A 300-page book (rounds to 300):</p>
              <p className="pl-3">
                100 × {config.page_points.first_100_rate} + 200 × {config.page_points.beyond_100_rate} ={" "}
                <span className="font-semibold text-gray-900">
                  {(100 * config.page_points.first_100_rate + 200 * config.page_points.beyond_100_rate).toFixed(2)} pts
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4.5 w-4.5 text-amber-500" />
            Bonuses
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Each bonus adds a % of your pre-bonus total (base + page points). Up to 3 per book.
          </p>
        </CardHeader>
        <CardContent className="text-sm divide-y divide-gray-100">
          {regularBonusKeys.map((key) => (
            <PointRow
              key={key}
              label={BONUS_LABELS[key]}
              value={`+${(config.bonuses[key] * 100).toFixed(1)}%`}
            />
          ))}
          <div className="pt-2 text-xs text-gray-400">
            Bonuses do not apply when a deduction is present.
          </div>
        </CardContent>
      </Card>

      {/* New Country */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4.5 w-4.5 text-teal-500" />
            New Country Bonus
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Automatically applied when a book&apos;s country hasn&apos;t been read before this season
          </p>
        </CardHeader>
        <CardContent className="text-sm divide-y divide-gray-100">
          <PointRow
            label="Unique country"
            value={`+${(config.bonuses.new_country * 100).toFixed(1)}%`}
          />
          <div className="pt-2 text-xs text-gray-400">
            Applied after deductions — stacks with deducted entries too.
          </div>
        </CardContent>
      </Card>

      {/* Hometown Bonuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-4.5 w-4.5 text-rose-500" />
            Hometown Bonuses
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Adds a % of your pre-bonus total. Pick one per book.
          </p>
        </CardHeader>
        <CardContent className="text-sm divide-y divide-gray-100">
          {(Object.keys(config.hometown_bonuses) as HometownBonusKey[]).map(
            (key) => (
              <PointRow
                key={key}
                label={HOMETOWN_BONUS_LABELS[key]}
                value={`+${(config.hometown_bonuses[key] * 100).toFixed(1)}%`}
              />
            )
          )}
        </CardContent>
      </Card>

      {/* Deductions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4.5 w-4.5 text-orange-500" />
            Deductions
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Multiplied against your total. When a deduction applies, regular bonuses and
            hometown bonuses are removed.
          </p>
        </CardHeader>
        <CardContent className="text-sm divide-y divide-gray-100">
          {(Object.keys(config.deductions) as DeductionKey[]).map((key) => (
            <PointRow
              key={key}
              label={DEDUCTION_LABELS[key]}
              value={`×${config.deductions[key]}`}
            />
          ))}
        </CardContent>
      </Card>

      {/* Season Bonuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4.5 w-4.5 text-purple-500" />
            Season Bonuses
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            End-of-season bonuses based on % of your total pre-bonus points across all books
          </p>
        </CardHeader>
        <CardContent className="text-sm divide-y divide-gray-100">
          <PointRow
            label="Complete all genres"
            value={`+${(config.season_bonuses.genre_complete_pct * 100).toFixed(0)}%`}
          />
          <PointRow
            label="13 unique starting letters"
            value={`+${(config.season_bonuses.alphabet_13_pct * 100).toFixed(0)}%`}
          />
          <PointRow
            label="26 unique starting letters (full alphabet)"
            value={`+${(config.season_bonuses.alphabet_26_pct * 100).toFixed(0)}%`}
          />
          <div className="pt-2 text-xs text-gray-400">
            Starting letters ignore leading &quot;The&quot;, &quot;A&quot;, and &quot;An&quot;.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
