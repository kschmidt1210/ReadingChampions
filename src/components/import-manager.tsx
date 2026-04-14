"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  saveSheetUrl,
  previewSheetImport,
  importFromSheet,
  type PreviewResult,
  type ImportResult,
} from "@/lib/actions/import";

interface Member {
  userId: string;
  displayName: string;
  role: string;
}

interface ImportManagerProps {
  orgId: string;
  seasonId: string | null;
  seasonName: string | null;
  savedSheetUrl: string | null;
  members: Member[];
}

export function ImportManager({
  orgId,
  seasonId,
  seasonName,
  savedSheetUrl,
  members,
}: ImportManagerProps) {
  const router = useRouter();
  const [sheetUrl, setSheetUrl] = useState(savedSheetUrl ?? "");
  const [confirmedUrl, setConfirmedUrl] = useState(savedSheetUrl);
  const [isSaving, startSaving] = useTransition();
  const [isPreviewing, startPreviewing] = useTransition();
  const [isImporting, startImporting] = useTransition();

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [wipeAllOpen, setWipeAllOpen] = useState(false);
  const [wipePlayerOpen, setWipePlayerOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const hasUrl = !!confirmedUrl;
  const urlIsSaved = !!(confirmedUrl && confirmedUrl === sheetUrl.trim());

  function handleSaveUrl() {
    startSaving(async () => {
      const result = await saveSheetUrl(orgId, sheetUrl);
      if (result.error) {
        toast.error(result.error);
      } else {
        setConfirmedUrl(sheetUrl.trim());
        toast.success("Sheet URL saved");
        router.refresh();
      }
    });
  }

  function handlePreview() {
    if (!seasonId) {
      toast.error("No active season");
      return;
    }
    setPreview(null);
    setImportResult(null);
    startPreviewing(async () => {
      const result = await previewSheetImport(orgId, seasonId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setPreview(result);
      }
    });
  }

  function handleImportAll() {
    if (!seasonId) return;
    setImportResult(null);
    startImporting(async () => {
      const result = await importFromSheet(orgId, seasonId, { mode: "all" });
      setWipeAllOpen(false);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setImportResult(result);
        toast.success(`Imported ${result.created} entries`);
      }
    });
  }

  function handleImportPlayer() {
    if (!seasonId || !selectedPlayerId) return;
    setImportResult(null);
    startImporting(async () => {
      const result = await importFromSheet(orgId, seasonId, {
        mode: "player",
        userId: selectedPlayerId,
      });
      setWipePlayerOpen(false);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setImportResult(result);
        const player = members.find((m) => m.userId === selectedPlayerId);
        toast.success(`Imported ${result.created} entries for ${player?.displayName ?? "player"}`);
      }
    });
  }

  if (!seasonId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No active season. Create a season first to use the import tool.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Sheet Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Google Sheet</CardTitle>
          <CardDescription>
            Connect your spreadsheet to import book entries. The sheet must be{" "}
            <a
              href="https://support.google.com/docs/answer/183965"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground inline-flex items-center gap-0.5"
            >
              published to the web
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            for import to work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sheet-url">Spreadsheet URL</Label>
            <div className="flex gap-2">
              <Input
                id="sheet-url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1"
              />
              <Button
                onClick={handleSaveUrl}
                disabled={isSaving || !sheetUrl.trim() || urlIsSaved}
                variant={urlIsSaved ? "outline" : "default"}
              >
                {isSaving ? "Saving..." : urlIsSaved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
          {hasUrl && (
            <p className="text-xs text-muted-foreground">
              Each player&apos;s tab name in the sheet must match their display name in the app.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Preview & Compare */}
      {hasUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Preview &amp; Compare</CardTitle>
            <CardDescription>
              Fetch data from the sheet and compare scores before importing.
              Importing into season: <strong>{seasonName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handlePreview}
              disabled={isPreviewing}
              variant="outline"
            >
              {isPreviewing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Fetch &amp; Preview
                </>
              )}
            </Button>

            {preview && <PreviewResults preview={preview} />}
          </CardContent>
        </Card>
      )}

      {/* 3. Import Actions */}
      {hasUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Import</CardTitle>
            <CardDescription>
              Wipe existing entries and re-import from the spreadsheet. This is destructive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wipe All */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Wipe All &amp; Re-import</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Deletes all book entries for the current season and replaces them from the spreadsheet.
                  </p>
                </div>
              </div>
              <Dialog open={wipeAllOpen} onOpenChange={setWipeAllOpen}>
                <DialogTrigger
                  render={
                    <Button variant="destructive" size="sm">
                      <Upload className="h-3.5 w-3.5" />
                      Wipe All &amp; Re-import
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Wipe All &amp; Re-import</DialogTitle>
                    <DialogDescription>
                      This will <strong>delete all book entries</strong> for the{" "}
                      <strong>{seasonName}</strong> season and replace them with data from the
                      Google Sheet. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleImportAll}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        "Confirm Wipe & Import"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Wipe Player */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Wipe Player &amp; Re-import
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Deletes one player&apos;s entries for the current season and re-imports from
                    their sheet tab.
                  </p>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <Label>Player</Label>
                  <Select value={selectedPlayerId || undefined} onValueChange={(v) => setSelectedPlayerId(v ?? "")}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Select player">
                        {(value: string) => {
                          const player = members.find((m) => m.userId === value);
                          return player?.displayName ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId} label={m.displayName}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={wipePlayerOpen} onOpenChange={setWipePlayerOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!selectedPlayerId}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Wipe &amp; Re-import
                      </Button>
                    }
                  />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Wipe Player &amp; Re-import</DialogTitle>
                      <DialogDescription>
                        This will delete all book entries for{" "}
                        <strong>
                          {members.find((m) => m.userId === selectedPlayerId)?.displayName ??
                            "this player"}
                        </strong>{" "}
                        in the <strong>{seasonName}</strong> season and replace them from the
                        sheet. This cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                      <Button
                        variant="destructive"
                        onClick={handleImportPlayer}
                        disabled={isImporting}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          "Confirm Wipe & Import"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Import Result */}
            {importResult && <ImportResultSummary result={importResult} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview Results Sub-component
// ---------------------------------------------------------------------------

function PreviewResults({ preview }: { preview: PreviewResult }) {
  const playersFound = preview.players.filter((p) => p.tabFound);
  const playersNotFound = preview.players.filter((p) => !p.tabFound);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{preview.totalRows}</p>
          <p className="text-xs text-muted-foreground">Total Rows</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{playersFound.length}</p>
          <p className="text-xs text-muted-foreground">Players Found</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{preview.mismatches.length}</p>
          <p className="text-xs text-muted-foreground">Score Mismatches</p>
        </div>
      </div>

      {/* Player Tabs */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Player Tabs</p>
        <div className="flex flex-wrap gap-1.5">
          {preview.players.map((p) => (
            <span
              key={p.userId}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                p.tabFound
                  ? "bg-green-100 text-green-800"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {p.tabFound ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {p.name}
              {p.tabFound && <span className="text-green-600">({p.rowCount})</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Score Mismatches */}
      {preview.mismatches.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-amber-700">
            Score Mismatches ({preview.mismatches.length})
          </p>
          <div className="rounded-lg border border-amber-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-amber-50">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium text-amber-800">Player</th>
                  <th className="text-left px-3 py-1.5 font-medium text-amber-800">Book</th>
                  <th className="text-right px-3 py-1.5 font-medium text-amber-800">Sheet</th>
                  <th className="text-right px-3 py-1.5 font-medium text-amber-800">App</th>
                  <th className="text-right px-3 py-1.5 font-medium text-amber-800">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {preview.mismatches.map((m, i) => (
                  <tr key={i} className="hover:bg-amber-50/50">
                    <td className="px-3 py-1.5">{m.player}</td>
                    <td className="px-3 py-1.5 max-w-[200px] truncate" title={m.title}>
                      {m.title}
                    </td>
                    <td className="text-right px-3 py-1.5 tabular-nums">{m.sheetPoints.toFixed(2)}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums">{m.appPoints.toFixed(2)}</td>
                    <td
                      className={`text-right px-3 py-1.5 tabular-nums font-medium ${
                        m.diff > 0 ? "text-red-600" : "text-blue-600"
                      }`}
                    >
                      {m.diff > 0 ? "+" : ""}
                      {m.diff.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parse Errors */}
      {preview.parseErrors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-red-700">
            Parse Errors ({preview.parseErrors.length})
          </p>
          <ul className="space-y-0.5 text-xs text-red-600">
            {preview.parseErrors.slice(0, 20).map((e, i) => (
              <li key={i}>
                {e.player} (row {e.rowIndex}): {e.reason}
              </li>
            ))}
            {preview.parseErrors.length > 20 && (
              <li className="text-red-400">
                ...and {preview.parseErrors.length - 20} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* No mismatches */}
      {preview.mismatches.length === 0 && preview.totalRows > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          All scores match between sheet and app calculations.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Result Sub-component
// ---------------------------------------------------------------------------

function ImportResultSummary({ result }: { result: ImportResult }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <p className="text-sm font-medium text-green-900">Import Complete</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-green-700">{result.created}</p>
          <p className="text-xs text-green-600">Created</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-600">{result.skipped}</p>
          <p className="text-xs text-amber-600">Skipped</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-600">{result.errors}</p>
          <p className="text-xs text-red-600">Errors</p>
        </div>
      </div>
      {result.details.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Details ({result.details.length})
          </summary>
          <ul className="mt-1 space-y-0.5 text-muted-foreground max-h-40 overflow-y-auto">
            {result.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
