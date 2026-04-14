"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Trash2, CheckCircle2 } from "lucide-react";
import { resolveFlaggedEntry } from "@/lib/actions/admin";
import { deleteBookEntry } from "@/lib/actions/books";
import { useOrg } from "./providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BONUS_LABELS, DEDUCTION_LABELS, HOMETOWN_BONUS_LABELS } from "@/lib/scoring-types";

export function FlaggedEntryCard({
  flag,
  onRemoved,
}: {
  flag: any;
  onRemoved?: (flagId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { currentOrgId } = useOrg();
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const entry = flag.book_entry;
  const book = entry?.book;

  function handleResolve() {
    if (!currentOrgId) return;
    startTransition(async () => {
      const result = await resolveFlaggedEntry(currentOrgId, flag.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Entry resolved");
        onRemoved?.(flag.id);
      }
    });
  }

  function handleDelete() {
    if (!currentOrgId || !entry) return;
    startTransition(async () => {
      try {
        await deleteBookEntry(entry.id, currentOrgId);
        toast.success("Entry deleted");
        onRemoved?.(flag.id);
      } catch {
        toast.error("Failed to delete entry");
      }
      setDeleteOpen(false);
    });
  }

  const bonuses = [entry?.bonus_1, entry?.bonus_2, entry?.bonus_3].filter(Boolean);
  const hasDetails = book || bonuses.length > 0 || entry?.deduction || entry?.hometown_bonus;

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-amber-200/80 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-400" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            {flag.resolved ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {book?.title ?? "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground">
              by {entry?.profile?.display_name ?? "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Points:{" "}
              <span className="font-medium text-foreground">
                {Number(entry?.points ?? 0).toFixed(2)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <Badge className="bg-amber-100 text-amber-800 border-amber-300/60 hover:bg-amber-100">
            {flag.reason.replace(/_/g, " ")}
          </Badge>
          {!flag.resolved && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleResolve}
                disabled={isPending}
                className="text-xs"
              >
                {isPending ? "Resolving..." : "Resolve"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          {flag.resolved && (
            <Badge variant="secondary" className="text-xs">
              Resolved
            </Badge>
          )}
        </div>
      </div>

      {hasDetails && (
        <div className="mt-3 pl-11">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Details
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {book && (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">Author</span>
                    <span>{book.author}</span>
                    <span className="text-muted-foreground">Pages</span>
                    <span>{book.pages}</span>
                    {book.country && (
                      <>
                        <span className="text-muted-foreground">Country</span>
                        <span>{book.country}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">Type</span>
                    <span>{entry.fiction ? "Fiction" : "Nonfiction"}</span>
                    {(entry.genre_name || entry.genre_id) && (
                      <>
                        <span className="text-muted-foreground">Genre</span>
                        <span>{entry.genre_name ?? entry.genre_id}</span>
                      </>
                    )}
                  </div>
                  {bonuses.length > 0 && (
                    <div className="pt-1">
                      <span className="text-muted-foreground text-xs">Bonuses: </span>
                      {bonuses.map((b: string) => (
                        <Badge
                          key={b}
                          variant="secondary"
                          className="text-xs mr-1"
                        >
                          {BONUS_LABELS[b as keyof typeof BONUS_LABELS] ?? b}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {entry.hometown_bonus && (
                    <div>
                      <span className="text-muted-foreground text-xs">Hometown: </span>
                      <Badge variant="secondary" className="text-xs">
                        {HOMETOWN_BONUS_LABELS[entry.hometown_bonus as keyof typeof HOMETOWN_BONUS_LABELS] ?? entry.hometown_bonus}
                      </Badge>
                    </div>
                  )}
                  {entry.deduction && (
                    <div>
                      <span className="text-muted-foreground text-xs">Deduction: </span>
                      <Badge variant="secondary" className="text-xs bg-red-50 text-red-700">
                        {DEDUCTION_LABELS[entry.deduction as keyof typeof DEDUCTION_LABELS] ?? entry.deduction}
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book Entry?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{book?.title}&rdquo; from{" "}
              {entry?.profile?.display_name ?? "this player"}&apos;s reading
              list. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
