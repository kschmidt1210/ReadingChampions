"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { deleteOrganization } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";

export function DangerZone({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOrganization(orgId);
      if (result?.error) {
        toast.error(
          typeof result.error === "string" ? result.error : "Failed to delete"
        );
      } else {
        toast.success("Organization deleted");
        router.push("/welcome");
      }
      setOpen(false);
    });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">Danger Zone</h3>
          <p className="text-sm text-red-700 mt-1">
            Deleting the organization is permanent. All seasons, book entries,
            genres, and member data will be lost.
          </p>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setConfirmName("");
            }}
          >
            <DialogTrigger
              render={
                <Button variant="destructive" size="sm" className="mt-3">
                  Delete Organization
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Organization</DialogTitle>
                <DialogDescription>
                  This action is <strong>irreversible</strong>. All data
                  including seasons, book entries, scoring rules, and member
                  records will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>
                  Type <strong>{orgName}</strong> to confirm
                </Label>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={orgName}
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending || confirmName !== orgName}
                >
                  {isPending ? "Deleting..." : "Delete Forever"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
