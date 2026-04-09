"use client";

import { useState, useTransition } from "react";
import { Pencil, Save, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { updateScoringRules, recalculateSeasonPoints } from "@/lib/actions/admin";
import type { ScoringRulesConfig } from "@/types/database";
import { BONUS_LABELS, DEDUCTION_LABELS } from "@/lib/scoring-types";

function NumberField({
  label,
  value,
  onChange,
  editing,
  suffix,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  editing: boolean;
  suffix?: string;
  prefix?: string;
}) {
  if (!editing) {
    return (
      <div className="flex justify-between">
        <span className="text-gray-500">{label}</span>
        <strong>
          {prefix}
          {value}
          {suffix}
        </strong>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 text-right"
      />
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  editing,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  editing: boolean;
}) {
  if (!editing) {
    return (
      <div className="flex justify-between">
        <span className="text-gray-500">{label}</span>
        <strong>+{(value * 100).toFixed(1)}%</strong>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.1"
          value={parseFloat((value * 100).toFixed(1))}
          onChange={(e) => onChange((parseFloat(e.target.value) || 0) / 100)}
          className="w-20 text-right"
        />
        <span className="text-xs text-gray-400">%</span>
      </div>
    </div>
  );
}

function MultiplierField({
  label,
  value,
  onChange,
  editing,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  editing: boolean;
}) {
  if (!editing) {
    return (
      <div className="flex justify-between">
        <span className="text-gray-500">{label}</span>
        <strong>&times;{value}</strong>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">&times;</span>
        <Input
          type="number"
          step="0.05"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 text-right"
        />
      </div>
    </div>
  );
}

export function ScoringEditor({
  orgId,
  rulesId,
  initialConfig,
  seasonId,
  entryCount = 0,
}: {
  orgId: string;
  rulesId: string;
  initialConfig: ScoringRulesConfig;
  seasonId: string | null;
  entryCount?: number;
}) {
  const [config, setConfig] = useState<ScoringRulesConfig>(initialConfig);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [savedConfig, setSavedConfig] = useState<ScoringRulesConfig>(initialConfig);

  function updateField<K extends keyof ScoringRulesConfig>(
    section: K,
    key: string,
    value: number
  ) {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  function handleCancel() {
    setConfig(savedConfig);
    setEditing(false);
  }

  const hasChanges =
    JSON.stringify(config) !== JSON.stringify(savedConfig);

  function handleSave() {
    startTransition(async () => {
      const result = await updateScoringRules(orgId, rulesId, config as any);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to save");
      } else {
        setSavedConfig(config);
        setEditing(false);
        if (entryCount > 0) {
          toast.success(
            `Scoring rules updated. Use "Recalculate" to apply to ${entryCount} existing entries.`
          );
        } else {
          toast.success("Scoring rules updated");
        }
      }
    });
  }

  function handleRecalculate() {
    if (!seasonId) return;
    startTransition(async () => {
      const result = await recalculateSeasonPoints(orgId, seasonId);
      if (result && "error" in result) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to recalculate");
      } else {
        toast.success(
          `Recalculated! ${result?.updated ?? 0} entries updated.`
        );
      }
      setRecalcOpen(false);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          {editing ? (
            <>
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
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit Rules
              </Button>
              {seasonId && (
                <Dialog open={recalcOpen} onOpenChange={setRecalcOpen}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Recalculate
                      </Button>
                    }
                  />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recalculate All Points?</DialogTitle>
                      <DialogDescription>
                        This will recompute points for every book entry in the
                        current season using the current scoring rules. This may
                        take a moment.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>
                        Cancel
                      </DialogClose>
                      <Button
                        onClick={handleRecalculate}
                        disabled={isPending}
                      >
                        {isPending ? "Recalculating..." : "Recalculate"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>
      </div>

      {editing && hasChanges && entryCount > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3 text-sm text-amber-800">
          Saving will update the scoring rules. You&apos;ll need to recalculate to
          apply changes to {entryCount} existing{" "}
          {entryCount === 1 ? "entry" : "entries"}.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Base Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <NumberField
            label="Fiction"
            value={config.base_points.fiction}
            onChange={(v) => updateField("base_points", "fiction", v)}
            editing={editing}
          />
          <NumberField
            label="Nonfiction"
            value={config.base_points.nonfiction}
            onChange={(v) => updateField("base_points", "nonfiction", v)}
            editing={editing}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <NumberField
            label="First 100 pages"
            value={config.page_points.first_100_rate}
            onChange={(v) => updateField("page_points", "first_100_rate", v)}
            editing={editing}
            suffix="/page"
          />
          <NumberField
            label="Beyond 100 pages"
            value={config.page_points.beyond_100_rate}
            onChange={(v) => updateField("page_points", "beyond_100_rate", v)}
            editing={editing}
            suffix="/page"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bonuses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(Object.keys(config.bonuses) as Array<keyof typeof config.bonuses>).map(
            (key) => (
              <PercentField
                key={key}
                label={BONUS_LABELS[key]}
                value={config.bonuses[key]}
                onChange={(v) => updateField("bonuses", key, v)}
                editing={editing}
              />
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hometown Bonuses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(
            Object.keys(config.hometown_bonuses) as Array<
              keyof typeof config.hometown_bonuses
            >
          ).map((key) => (
            <PercentField
              key={key}
              label={key.replace(/_/g, " ")}
              value={config.hometown_bonuses[key]}
              onChange={(v) => updateField("hometown_bonuses", key, v)}
              editing={editing}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deductions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(
            Object.keys(config.deductions) as Array<
              keyof typeof config.deductions
            >
          ).map((key) => (
            <MultiplierField
              key={key}
              label={DEDUCTION_LABELS[key]}
              value={config.deductions[key]}
              onChange={(v) => updateField("deductions", key, v)}
              editing={editing}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Season Bonuses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <PercentField
            label="Complete All Genres"
            value={config.season_bonuses.genre_complete_pct}
            onChange={(v) => updateField("season_bonuses", "genre_complete_pct", v)}
            editing={editing}
          />
          <PercentField
            label="Alphabet 13 Letters"
            value={config.season_bonuses.alphabet_13_pct}
            onChange={(v) => updateField("season_bonuses", "alphabet_13_pct", v)}
            editing={editing}
          />
          <PercentField
            label="Alphabet 26 Letters"
            value={config.season_bonuses.alphabet_26_pct}
            onChange={(v) => updateField("season_bonuses", "alphabet_26_pct", v)}
            editing={editing}
          />
        </CardContent>
      </Card>
    </div>
  );
}

