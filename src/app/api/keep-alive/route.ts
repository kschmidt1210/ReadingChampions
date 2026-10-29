import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight ping so the Supabase free-tier project does not pause
 * for inactivity. Invoked daily by Vercel Cron (see vercel.json).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed in production so the route cannot be scraped anonymously.
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 }
      );
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Any successful PostgREST round-trip counts as project activity.
  const { error } = await supabase.from("profiles").select("id").limit(1);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
