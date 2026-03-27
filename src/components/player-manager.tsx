"use client";

import { useState, useTransition, useMemo } from "react";
import { Search, Shield, ShieldOff, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { updateMemberRole, removeMember } from "@/lib/actions/admin";
import { MoreHorizontal } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: { display_name: string } | null;
}

export function PlayerManager({
  orgId,
  initialMembers,
  currentUserId,
}: {
  orgId: string;
  initialMembers: Member[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) =>
      (m.profile?.display_name ?? "").toLowerCase().includes(q)
    );
  }, [members, search]);

  function handleRoleChange(member: Member) {
    const newRole = member.role === "admin" ? "player" : "admin";
    startTransition(async () => {
      const result = await updateMemberRole(orgId, member.id, newRole as any);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to update role");
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
        );
        toast.success(
          `${member.profile?.display_name ?? "Member"} is now ${newRole === "admin" ? "an admin" : "a player"}`
        );
      }
    });
  }

  function handleRemove() {
    if (!removeTarget) return;
    const target = removeTarget;
    startTransition(async () => {
      const result = await removeMember(orgId, target.id);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to remove member");
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== target.id));
        toast.success(`${target.profile?.display_name ?? "Member"} removed`);
      }
      setRemoveTarget(null);
    });
  }

  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Players ({members.length})</h2>
      </div>

      {members.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="pl-9"
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {filtered.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const isLastAdmin = member.role === "admin" && adminCount <= 1;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">
                    {member.profile?.display_name ?? "Unknown"}
                    {isCurrentUser && (
                      <span className="text-xs text-gray-400 ml-1.5">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    Joined{" "}
                    {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={member.role === "admin" ? "default" : "secondary"}
                >
                  {member.role}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={isPending || isLastAdmin}
                      onClick={() => handleRoleChange(member)}
                    >
                      {member.role === "admin" ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-1.5" />
                          Demote to Player
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-1.5" />
                          Promote to Admin
                        </>
                      )}
                    </DropdownMenuItem>
                    {!isCurrentUser && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending || isLastAdmin}
                          onClick={() => setRemoveTarget(member)}
                        >
                          <UserMinus className="h-4 w-4 mr-1.5" />
                          Remove from Org
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No players match your search.
          </p>
        )}
      </div>

      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Player?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {removeTarget?.profile?.display_name ?? "this member"}
              </strong>{" "}
              from the organization? Their book entries will remain on record but
              they will lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isPending}
            >
              {isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
