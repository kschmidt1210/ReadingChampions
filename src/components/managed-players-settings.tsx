"use client";

import { useState, useTransition } from "react";
import { Users, Plus, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createManagedPlayer, unlinkManagedPlayer } from "@/lib/actions/managed-players";

interface ManagedPlayersSettingsProps {
  orgId: string;
  managedPlayers: Array<{
    managedUserId: string;
    displayName: string;
  }>;
}

export function ManagedPlayersSettings({
  orgId,
  managedPlayers: initialPlayers,
}: ManagedPlayersSettingsProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createManagedPlayer(orgId, trimmed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${trimmed} as a managed player.`);
      setPlayers((prev) => [
        ...prev,
        { managedUserId: result.userId!, displayName: trimmed },
      ]);
      setNewName("");
      setShowAddForm(false);
    });
  }

  function handleUnlink(managedUserId: string, displayName: string) {
    setUnlinkingId(managedUserId);
    startTransition(async () => {
      const result = await unlinkManagedPlayer(orgId, managedUserId);
      if (result.error) {
        toast.error(result.error);
        setUnlinkingId(null);
        return;
      }
      toast.success(`Unlinked ${displayName}.`);
      setPlayers((prev) => prev.filter((p) => p.managedUserId !== managedUserId));
      setUnlinkingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Managed Players</h2>
      </div>
      <p className="text-sm text-gray-500">
        Add child accounts that you manage. You can log and manage books on their behalf.
      </p>

      {players.length > 0 && (
        <div className="space-y-2">
          {players.map((p) => (
            <div
              key={p.managedUserId}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-indigo-600">
                    {p.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">{p.displayName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-500"
                onClick={() => handleUnlink(p.managedUserId, p.displayName)}
                disabled={isPending || unlinkingId === p.managedUserId}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Unlink</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <Label className="text-sm font-medium text-gray-700">Child&apos;s display name</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Emma"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={isPending || !newName.trim()}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              {isPending ? "Adding..." : "Add"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAddForm(false); setNewName(""); }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Child
        </Button>
      )}
    </div>
  );
}
