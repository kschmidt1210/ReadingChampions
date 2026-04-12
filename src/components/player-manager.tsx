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
  Pencil,
  Users,
  Unlink,
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
  updatePlayerName,
  updatePlayerEmail,
  generatePlayerInvite,
} from "@/lib/actions/admin";
import {
  linkManagedPlayer,
  unlinkManagedPlayer,
} from "@/lib/actions/managed-players";

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

interface ManagedLink {
  id: string;
  parentUserId: string;
  managedUserId: string;
}

export function PlayerManager({
  orgId,
  initialMembers,
  currentUserId,
  managedPlayerLinks: initialLinks = [],
}: {
  orgId: string;
  initialMembers: Member[];
  currentUserId: string;
  managedPlayerLinks?: ManagedLink[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [nameTarget, setNameTarget] = useState<Member | null>(null);
  const [newName, setNewName] = useState("");
  const [emailTarget, setEmailTarget] = useState<Member | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<{ link: string; name: string } | null>(null);
  const [managedLinks, setManagedLinks] = useState<ManagedLink[]>(initialLinks);
  const [linkChildTarget, setLinkChildTarget] = useState<Member | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [parentSearch, setParentSearch] = useState("");

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
      } else if (result?.role) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: result.role! } : m))
        );
        toast.success(
          `${member.profile?.display_name ?? "Member"} is now ${result.role === "admin" ? "an admin" : "a player"}`
        );
      } else {
        toast.error("Unexpected response — role may not have updated");
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

  function openNameDialog(member: Member) {
    setNameTarget(member);
    setNewName(member.profile?.display_name ?? "");
  }

  function handleNameUpdate() {
    if (!nameTarget) return;
    const target = nameTarget;
    startTransition(async () => {
      const result = await updatePlayerName(orgId, target.user_id, newName);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to update name");
      } else if (result?.name) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === target.id
              ? { ...m, profile: { display_name: result.name! } }
              : m
          )
        );
        toast.success(`Name updated to ${result.name}`);
        setNameTarget(null);
        setNewName("");
      }
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
        setInviteLink({
          link: result.link,
          name: member.profile?.display_name ?? "player",
        });
      }
    });
  }

  async function handleCopyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink.link);
      setCopiedUserId(inviteLink.name);
      toast.success(`Invite link copied to clipboard`);
      setTimeout(() => setCopiedUserId(null), 2000);
    } catch {
      toast.error("Failed to copy — please select and copy the link manually");
    }
  }

  function getParentOf(userId: string): Member | null {
    const link = managedLinks.find((l) => l.managedUserId === userId);
    if (!link) return null;
    return members.find((m) => m.user_id === link.parentUserId) ?? null;
  }

  function isChildOf(userId: string): boolean {
    return managedLinks.some((l) => l.managedUserId === userId);
  }

  function openLinkDialog(child: Member) {
    setLinkChildTarget(child);
    setSelectedParentId("");
    setParentSearch("");
  }

  function handleLinkChild() {
    if (!linkChildTarget || !selectedParentId) return;
    const child = linkChildTarget;
    startTransition(async () => {
      const result = await linkManagedPlayer(orgId, selectedParentId, child.user_id);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to link player");
      } else {
        const parentName = members.find((m) => m.user_id === selectedParentId)?.profile?.display_name ?? "parent";
        setManagedLinks((prev) => [
          ...prev,
          { id: crypto.randomUUID(), parentUserId: selectedParentId, managedUserId: child.user_id },
        ]);
        toast.success(`${child.profile?.display_name ?? "Player"} is now managed by ${parentName}`);
      }
      setLinkChildTarget(null);
      setSelectedParentId("");
    });
  }

  function handleUnlinkChild(managedUserId: string) {
    const child = members.find((m) => m.user_id === managedUserId);
    startTransition(async () => {
      const result = await unlinkManagedPlayer(orgId, managedUserId);
      if (result?.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to unlink player");
      } else {
        setManagedLinks((prev) => prev.filter((l) => l.managedUserId !== managedUserId));
        toast.success(`${child?.profile?.display_name ?? "Player"} is no longer a managed player`);
      }
    });
  }

  const parentPickerPool = useMemo(() => {
    if (!linkChildTarget) return [];
    return members.filter((m) => {
      if (m.user_id === linkChildTarget.user_id) return false;
      if (managedLinks.some((l) => l.managedUserId === m.user_id)) return false;
      return true;
    });
  }, [members, linkChildTarget, managedLinks]);

  const parentPickerCandidates = useMemo(() => {
    const q = parentSearch.toLowerCase().trim();
    if (!q) return parentPickerPool;
    return parentPickerPool.filter((m) =>
      (m.profile?.display_name ?? "").toLowerCase().includes(q)
    );
  }, [parentPickerPool, parentSearch]);

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
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <EmailStatus email={member.email} />
                    {(() => {
                      const parent = getParentOf(member.user_id);
                      if (!parent) return null;
                      return (
                        <Badge variant="outline" className="text-xs font-normal text-indigo-600 border-indigo-200 bg-indigo-50">
                          <Users className="h-3 w-3 mr-1" />
                          Managed by {parent.profile?.display_name ?? "Unknown"}
                        </Badge>
                      );
                    })()}
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
                      onClick={() => openNameDialog(member)}
                    >
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Edit Name
                    </DropdownMenuItem>
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

                    {!isCurrentUser && !isChildOf(member.user_id) && (
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => openLinkDialog(member)}
                      >
                        <Users className="h-4 w-4 mr-1.5" />
                        Link as child of...
                      </DropdownMenuItem>
                    )}

                    {isChildOf(member.user_id) && (
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => handleUnlinkChild(member.user_id)}
                      >
                        <Unlink className="h-4 w-4 mr-1.5" />
                        Unlink from parent
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

      {/* Edit Name Dialog */}
      <Dialog
        open={!!nameTarget}
        onOpenChange={(open) => {
          if (!open) {
            setNameTarget(null);
            setNewName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
            <DialogDescription>
              Update the name for {nameTarget?.profile?.display_name ?? "this player"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="player-name">Name</Label>
              <Input
                id="player-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Player name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    e.preventDefault();
                    handleNameUpdate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" onClick={() => setNewName("")} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleNameUpdate}
              disabled={isPending || !newName.trim()}
            >
              {isPending ? "Saving..." : "Save Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Invite Link Dialog */}
      <Dialog
        open={!!inviteLink}
        onOpenChange={(open) => !open && setInviteLink(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Link for {inviteLink?.name}</DialogTitle>
            <DialogDescription>
              Send this link to {inviteLink?.name}. They&apos;ll be asked to set
              their own password. The link expires after a short time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink?.link ?? ""}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="icon"
                variant="outline"
                className="shrink-0"
                onClick={handleCopyInviteLink}
              >
                {copiedUserId === inviteLink?.name ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Done
            </DialogClose>
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

      {/* Link as Child Dialog */}
      <Dialog
        open={!!linkChildTarget}
        onOpenChange={(open) => {
          if (!open) {
            setLinkChildTarget(null);
            setSelectedParentId("");
            setParentSearch("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Link {linkChildTarget?.profile?.display_name ?? "Player"} as a
              managed child
            </DialogTitle>
            <DialogDescription>
              Select a parent player who will manage{" "}
              {linkChildTarget?.profile?.display_name ?? "this player"}&apos;s
              books. The parent will be able to log and edit book entries on
              their behalf.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {parentPickerPool.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  placeholder="Search for parent..."
                  className="pl-9"
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto divide-y rounded-lg border">
              {parentPickerCandidates.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setSelectedParentId(m.user_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedParentId === m.user_id
                      ? "bg-indigo-50 ring-1 ring-inset ring-indigo-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-indigo-600">
                      {(m.profile?.display_name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.profile?.display_name ?? "Unknown"}
                    </p>
                    {m.email && !isPlaceholderEmail(m.email) && (
                      <p className="text-xs text-gray-400 truncate">{m.email}</p>
                    )}
                  </div>
                  {selectedParentId === m.user_id && (
                    <Check className="h-4 w-4 text-indigo-600 ml-auto shrink-0" />
                  )}
                </button>
              ))}
              {parentPickerCandidates.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  No eligible parents found.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedParentId("");
                    setParentSearch("");
                  }}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleLinkChild}
              disabled={isPending || !selectedParentId}
            >
              {isPending ? "Linking..." : "Link Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
