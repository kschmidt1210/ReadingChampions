/**
 * Fix script: Update a player's email from the placeholder to their real email.
 *
 * This updates the email in auth.users (Supabase Auth) — all other data
 * (book_entries, org_members, profiles) is linked by user_id, so it stays
 * intact automatically.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/fix-player-email.ts
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Players to update: old placeholder email → real email
// Add more entries here once Josh is confirmed working.
// ---------------------------------------------------------------------------
const UPDATES: { oldEmail: string; newEmail: string; name: string }[] = [
  { name: "Josh", oldEmail: "josh@readingchampions.app", newEmail: "joshua.graves.13@gmail.com" },
];

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const { name, oldEmail, newEmail } of UPDATES) {
    console.log(`\nProcessing ${name}: ${oldEmail} → ${newEmail}`);

    // 1. Find the user by their current placeholder email
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const user = usersData?.users?.find((u: any) => u.email === oldEmail);

    if (!user) {
      console.error(`  [error] No user found with email ${oldEmail}`);
      continue;
    }

    console.log(`  Found user ID: ${user.id}`);

    // 2. Check that the new email isn't already taken by another account
    const conflict = usersData?.users?.find((u: any) => u.email === newEmail);
    if (conflict) {
      console.error(`  [error] Email ${newEmail} is already used by user ${conflict.id}. Skipping.`);
      continue;
    }

    // 3. Update the email in auth.users via Admin API
    const { data: updated, error } = await supabase.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true, // confirm immediately, no verification email
    });

    if (error) {
      console.error(`  [error] Failed to update email: ${error.message}`);
      continue;
    }

    console.log(`  [success] ${name}'s email updated to ${newEmail}`);
    console.log(`  All book entries, org membership, and profile remain linked (same user_id: ${user.id})`);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
