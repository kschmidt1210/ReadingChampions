"use client";

import { useState } from "react";
import { createOrganization } from "@/lib/actions/organizations";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WelcomePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [inviteCode, setInviteCode] = useState("");

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createOrganization(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  if (mode === "create") {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create a Competition</CardTitle>
          <CardDescription>
            Set up a new reading championship for your group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Competition Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Book Club 2026"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Competition"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setMode("choose")}
            >
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (mode === "join") {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join a Competition</CardTitle>
          <CardDescription>
            Enter the invite code your friend shared with you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = inviteCode.trim();
              if (trimmed) {
                window.location.href = `/join/${trimmed}`;
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. ABC123"
                className="text-center text-lg font-mono tracking-widest uppercase"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!inviteCode.trim()}
            >
              Join Competition
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode("choose");
                setInviteCode("");
              }}
            >
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome!</CardTitle>
        <CardDescription>
          Get started by creating a competition or joining one with an invite
          code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full" onClick={() => setMode("create")}>
          Create a Competition
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMode("join")}
        >
          Join with Invite Code
        </Button>
        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
            Sign Out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
