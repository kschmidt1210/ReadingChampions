"use client";

import { useState, useTransition } from "react";
import { Calendar, Archive, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { archiveSeason, createNewSeason } from "@/lib/actions/admin";

interface Season {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string | null;
}

export function SeasonManager({
  orgId,
  activeSeason,
  archivedSeasons,
  activeEntryCount,
}: {
  orgId: string;
  activeSeason: Season | null;
  archivedSeasons: Season[];
  activeEntryCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [endSeasonOpen, setEndSeasonOpen] = useState(false);
  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState(
    `${new Date().getFullYear()} Championship`
  );

  function handleEndSeason() {
    if (!activeSeason) return;
    startTransition(async () => {
      const result = await archiveSeason(orgId, activeSeason.id);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to archive season");
      } else {
        toast.success("Season archived");
        setEndSeasonOpen(false);
      }
    });
  }

  function handleCreateSeason() {
    const name = newSeasonName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createNewSeason(orgId, name);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to create season");
      } else {
        toast.success("New season started");
        setNewSeasonOpen(false);
      }
    });
  }

  function formatDate(date: string) {
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getDuration(startDate: string) {
    const start = new Date(startDate + "T00:00:00");
    const now = new Date();
    const days = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? "s" : ""}`;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Season</CardTitle>
          <div className="flex gap-2">
            {activeSeason && (
              <Dialog open={endSeasonOpen} onOpenChange={setEndSeasonOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Archive className="h-3.5 w-3.5 mr-1.5" />
                      End Season
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>End Current Season?</DialogTitle>
                    <DialogDescription>
                      This will archive &ldquo;{activeSeason.name}&rdquo; and
                      freeze its leaderboard. The season has{" "}
                      <strong>{activeEntryCount}</strong> book{" "}
                      {activeEntryCount === 1 ? "entry" : "entries"}. This
                      action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleEndSeason}
                      disabled={isPending}
                    >
                      {isPending ? "Archiving..." : "End Season"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {!activeSeason && (
              <Dialog open={newSeasonOpen} onOpenChange={setNewSeasonOpen}>
                <DialogTrigger
                  render={
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      New Season
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Season</DialogTitle>
                    <DialogDescription>
                      Create a new competition season. All players start fresh.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Season Name</Label>
                    <Input
                      value={newSeasonName}
                      onChange={(e) => setNewSeasonName(e.target.value)}
                      placeholder="e.g. 2026 Championship"
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <Button
                      onClick={handleCreateSeason}
                      disabled={isPending || !newSeasonName.trim()}
                    >
                      {isPending ? "Creating..." : "Start Season"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeSeason ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{activeSeason.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">
                  {formatDate(activeSeason.start_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {getDuration(activeSeason.start_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entries</p>
                <p className="font-medium">{activeEntryCount}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No active season. Start a new one to begin tracking books.
            </p>
          )}
        </CardContent>
      </Card>

      {archivedSeasons.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistory ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Past Seasons ({archivedSeasons.length})
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {archivedSeasons.map((season) => (
                <div
                  key={season.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{season.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(season.start_date)}
                        {season.end_date && ` — ${formatDate(season.end_date)}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Archived</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
