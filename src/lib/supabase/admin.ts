import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with service-role privileges for admin auth operations
 * (updating user emails, generating invite links, etc.).
 *
 * Only use in server actions that have already verified the caller is an org admin.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
