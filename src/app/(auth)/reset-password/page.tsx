"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const result = await updatePassword(formData);
      if (result?.error) {
        return { error: result.error };
      }
      return { error: null };
    },
    { error: null },
  );

  return (
    <Card className="shadow-xl shadow-indigo-500/5 border-gray-200/80">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription>
          Choose a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <fieldset disabled={isPending} className="space-y-4">
            {state.error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200/60">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder="Type it again"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save Password"
              )}
            </button>
          </fieldset>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="text-indigo-600 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
