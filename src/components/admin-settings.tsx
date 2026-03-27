"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  renameOrganization,
  regenerateInviteCode,
} from "@/lib/actions/organizations";

export function OrgNameEditor({
  orgId,
  initialName,
}: {
  orgId: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renameOrganization(orgId, trimmed);
      if (result.error) {
        toast.error(result.error);
      } else {
        setName(result.name!);
        toast.success("Organization renamed");
        setEditing(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="max-w-xs"
          autoFocus
          disabled={isPending}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            setDraft(name);
            setEditing(false);
          }}
          disabled={isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-lg font-semibold">{name}</p>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5 text-gray-400" />
      </Button>
    </div>
  );
}

export function InviteCodeSection({
  orgId,
  initialCode,
}: {
  orgId: string;
  initialCode: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`;

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateInviteCode(orgId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.invite_code) {
        setCode(result.invite_code);
        toast.success("Invite code regenerated");
      }
      setDialogOpen(false);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-2xl font-mono font-bold tracking-widest">
            {code}
          </p>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => handleCopy(code)}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="truncate">{joinUrl}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => handleCopy(joinUrl)}
          >
            <Copy className="h-3.5 w-3.5 text-gray-400" />
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate Code
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate Invite Code?</DialogTitle>
              <DialogDescription>
                This will invalidate the current code and join link. Anyone with
                the old code will no longer be able to join.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleRegenerate}
                disabled={isPending}
              >
                {isPending ? "Regenerating..." : "Regenerate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
