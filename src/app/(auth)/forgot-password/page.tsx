"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
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

type FormState = { error: string | null; success: boolean };

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const result = await requestPasswordReset(formData);
      if (result?.success) {
        return { error: null, success: true };
      }
      return { error: "Something went wrong. Please try again.", success: false };
    },
    { error: null, success: false },
  );

  return (
    <Card className="shadow-xl shadow-indigo-500/5 border-gray-200/80">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Mail className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
        <CardDescription>
          Enter the email address on your account and we&apos;ll send you a link
          to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200/60">
              <p className="font-medium">Check your email</p>
              <p className="mt-1 text-emerald-600">
                If an account exists with that email, you&apos;ll receive a
                password reset link shortly.
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-indigo-600 font-medium hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction}>
            <fieldset disabled={isPending} className="space-y-4">
              {state.error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200/60">
                  {state.error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
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
                    Sending link…
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </fieldset>
          </form>
        )}
      </CardContent>
      {!state.success && (
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
