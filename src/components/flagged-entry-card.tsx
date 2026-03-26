"use client";

import { useTransition } from "react";
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
    <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">
            {flag.book_entry?.book?.title ?? "Unknown"}
          </p>
          <p className="text-sm text-gray-500">
            by {flag.book_entry?.profile?.display_name ?? "Unknown"}
          </p>
          <p className="text-sm text-gray-500">
            Points: {Number(flag.book_entry?.points ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="destructive">
            {flag.reason.replace("_", " ")}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResolve}
            disabled={isPending}
          >
            {isPending ? "Resolving..." : "Resolve"}
          </Button>
        </div>
      </div>
    </div>
  );
}
