"use client";

import { useState } from "react";
import { joinOrganization } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JoinForm({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setLoading(true);
    setError(null);
    const result = await joinOrganization(code);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Join a Competition</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join a reading competition!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="rounded-md bg-slate-100 p-4 text-center">
          <p className="text-sm text-muted-foreground">Invite Code</p>
          <p className="text-2xl font-mono font-bold tracking-widest">
            {code.toUpperCase()}
          </p>
        </div>
        <Button onClick={handleJoin} className="w-full" disabled={loading}>
          {loading ? "Joining..." : "Join Competition"}
        </Button>
      </CardContent>
    </Card>
  );
}
