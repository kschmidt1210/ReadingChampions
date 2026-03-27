"use client";

import { useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { resolveFlaggedEntry } from "@/lib/actions/admin";
import { useOrg } from "./providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FlaggedEntryCard({ flag }: { flag: any }) {
  const [isPending, startTransition] = useTransition();
  const { currentOrgId } = useOrg();

  function handleResolve() {
    if (!currentOrgId) return;
    startTransition(async () => {
      const result = await resolveFlaggedEntry(currentOrgId, flag.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Entry resolved");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-200/80 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-400" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {flag.book_entry?.book?.title ?? "Unknown"}
            </p>
            <p className="text-sm text-gray-500">
              by {flag.book_entry?.profile?.display_name ?? "Unknown"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Points: <span className="font-medium text-gray-700">{Number(flag.book_entry?.points ?? 0).toFixed(2)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <Badge className="bg-amber-100 text-amber-800 border-amber-300/60 hover:bg-amber-100">
            {flag.reason.replace("_", " ")}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResolve}
            disabled={isPending}
            className="text-xs"
          >
            {isPending ? "Resolving..." : "Resolve"}
          </Button>
        </div>
      </div>
    </div>
  );
}
