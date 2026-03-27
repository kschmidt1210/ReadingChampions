"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Search,
  Shield,
  ShieldOff,
  UserMinus,
  Mail,
  Link2,
  MoreHorizontal,
  Copy,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  updateMemberRole,
  removeMember,
  updatePlayerEmail,
  generatePlayerInvite,
} from "@/lib/actions/admin";

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  profile: { display_name: string } | null;
}

const PLACEHOLDER_DOMAIN = "@readingchampions.app";

function isPlaceholderEmail(email: string | null): boolean {
  return !!email && email.endsWith(PLACEHOLDER_DOMAIN);
}

function EmailStatus({ email }: { email: string | null }) {
  if (!email) {
    return (
      <Badge variant="outline" className="text-xs font-normal text-gray-400">
        no email
      </Badge>
    );
  }
  if (isPlaceholderEmail(email)) {
    return (
      <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300 bg-amber-50">
        placeholder
      </Badge>
    );
  }
  return (
    <span className="text-xs text-gray-400 truncate max-w-48">{email}</span>
  );
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
  const [emailTarget, setEmailTarget] = useState<Member | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        (m.profile?.display_name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q)
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

  function openEmailDialog(member: Member) {
    setEmailTarget(member);
    setNewEmail(isPlaceholderEmail(member.email) ? "" : (member.email ?? ""));
  }

  function handleEmailUpdate() {
    if (!emailTarget) return;
    const target = emailTarget;
    startTransition(async () => {
      const result = await updatePlayerEmail(orgId, target.user_id, newEmail);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to update email");
      } else if (result?.email) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === target.id ? { ...m, email: result.email! } : m
          )
        );
        toast.success(
          `${target.profile?.display_name ?? "Member"}'s email updated`
        );
        setEmailTarget(null);
        setNewEmail("");
      }
    });
  }

  function handleGenerateInvite(member: Member) {
    startTransition(async () => {
      const result = await generatePlayerInvite(orgId, member.user_id);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to generate invite");
      } else if (result?.link) {
        await navigator.clipboard.writeText(result.link);
        setCopiedUserId(member.user_id);
        toast.success(
          `Invite link for ${member.profile?.display_name ?? "player"} copied to clipboard`
        );
        setTimeout(() => setCopiedUserId(null), 2000);
      }
    });
  }

  const adminCount = members.filter((m) => m.role === "admin").length;
  const placeholderCount = members.filter((m) => isPlaceholderEmail(m.email)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Players ({members.length})</h2>
        {placeholderCount > 0 && (
          <p className="text-xs text-amber-600">
            {placeholderCount} placeholder{placeholderCount !== 1 ? "s" : ""} need email
          </p>
        )}
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
          const isPlaceholder = isPlaceholderEmail(member.email);
          const canInvite = !isPlaceholder && member.email;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium">
                    {member.profile?.display_name ?? "Unknown"}
                    {isCurrentUser && (
                      <span className="text-xs text-gray-400 ml-1.5">
                        (you)
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <EmailStatus email={member.email} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
                      disabled={isPending}
                      onClick={() => openEmailDialog(member)}
                    >
                      <Mail className="h-4 w-4 mr-1.5" />
                      {isPlaceholder ? "Assign Email" : "Edit Email"}
                    </DropdownMenuItem>

                    {canInvite && (
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => handleGenerateInvite(member)}
                      >
                        {copiedUserId === member.user_id ? (
                          <Check className="h-4 w-4 mr-1.5" />
                        ) : (
                          <Link2 className="h-4 w-4 mr-1.5" />
                        )}
                        Copy Invite Link
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

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

      {/* Edit Email Dialog */}
      <Dialog
        open={!!emailTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEmailTarget(null);
            setNewEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {emailTarget && isPlaceholderEmail(emailTarget.email)
                ? "Assign Email"
                : "Edit Email"}
            </DialogTitle>
            <DialogDescription>
              {emailTarget && isPlaceholderEmail(emailTarget.email)
                ? `Replace the placeholder email for ${emailTarget?.profile?.display_name ?? "this player"} with their real email address. All book entries will stay linked.`
                : `Update the email address for ${emailTarget?.profile?.display_name ?? "this player"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {emailTarget && isPlaceholderEmail(emailTarget.email) && (
              <div className="text-xs text-gray-400">
                Current: <span className="font-mono">{emailTarget.email}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="player-email">Email Address</Label>
              <Input
                id="player-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="player@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newEmail.trim()) {
                    e.preventDefault();
                    handleEmailUpdate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" onClick={() => setNewEmail("")} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleEmailUpdate}
              disabled={isPending || !newEmail.trim()}
            >
              {isPending ? "Saving..." : "Save Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Player Dialog */}
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
