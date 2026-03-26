import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinForm } from "./join-form";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, redirect to signup with return URL
  if (!user) {
    redirect(`/signup?redirect=/join/${code}`);
  }

  return <JoinForm code={code} />;
}
