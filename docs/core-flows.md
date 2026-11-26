# Core Flows: Super Reader Championship

Reviewed against the code on `main` on 2026-11-23. When a flow changes, update this doc.

This file has two parts:

- **Part 1, Voice brief:** About one page. Paste it into Claude (or a Claude Project's knowledge) before a voice conversation. It is designed to be enough context for a useful discussion without the codebase.
- **Part 2, Flow reference:** Every core flow, with steps, rules, edge cases, and code pointers. Use this for building and reviewing features.

---

## Part 1: Voice brief

Paste everything between the lines.

---

**What the app is**

Super Reader Championship is a mobile-first web app (installable PWA) for friend groups and book clubs that run a reading competition. Players log books they've read, earn points from a scoring formula, and compete on a leaderboard. It replaces a Google Sheet. Built with Next.js, Supabase (Postgres, auth, row-level security), Tailwind, and Open Library for book lookup.

**Vocabulary**

- **Competition** (also "organization" in code): one group's independent game. Has its own players, genre list, scoring rules, and seasons. A user can belong to several.
- **Season:** a period inside a competition, such as "2026 Championship." One active season at a time. Points are per season. Old seasons get archived.
- **Book entry:** one player's record of one book in one season. Holds status, pages, genre, rating, bonuses, deduction, and points.
- **Status:** Currently Reading, Completed, or Did Not Finish (DNF).
- **Bonus chips:** up to 3 per entry. Each adds a percentage of that book's base-plus-page points (Series, Translation, Award Winner, Classics, and so on).
- **Hometown bonus:** one optional bonus for a setting or title tied to the group's home state or city.
- **Deduction:** at most one per entry. It multiplies the whole score down (audiobook 0.75, re-read 0.5, graphic novel 0.3, and so on). Choosing a deduction turns off the bonus chips.
- **Genre challenge:** the competition's genre list. Covering every genre earns a season bonus.
- **Alphabet challenge:** the first letter of the title, ignoring "The," "A," and "An." 13 or more letters earns a bonus. All 26 earns a bigger one.
- **Longest road:** flat points for the top 3 players by unique countries read and by longest series read.
- **Managed player:** a child or family member that a parent logs books for. They have a profile in the competition but no login until promoted.
- **Community:** the competition's shared feed of posts, threaded comments, emoji reactions, and images.
- **Flagged entry:** an entry the app marks for admin review. Reasons: unusually high points, or the same book logged twice in one season. Flagging never blocks a save.

**Roles**

- **Player:** logs and edits their own books, views the leaderboard and rules, posts in community.
- **Admin (organizer):** everything a player can do, plus competition settings, invite codes, players and roles, genres, scoring rules, seasons, flagged entries, and sheet import.
- **Parent:** a player who manages one or more managed players.

**Core flows**

1. Sign up or log in.
2. Create a competition.
3. Join a competition with an invite code.
4. Log a book: search or enter manually, fill in fields, watch the live score, save.
5. Edit or delete a book entry.
6. Check the leaderboard and the Rules & Points page.
7. Review my books.
8. Post and comment in the community feed.
9. Parent logs books for a managed player.
10. Admin: manage players, genres, scoring, flags, seasons, and sheet import.

**How scoring works, in plain English**

1. **Base points:** 0.71 for fiction, 1.26 for nonfiction. Completed and currently-reading books both get base points. DNF books get none.
2. **Page points:** pages are rounded to the nearest 50. The first 100 pages are worth 0.0028 points each. Pages beyond 100 are worth 0.01 each. DNF books count only the pages read.
3. **Bonus chips:** each adds its percentage of the base-plus-page total.
4. **Deduction:** multiplies the post-bonus total. Selecting one zeroes the bonus chips and the hometown bonus.
5. **New country:** automatic, not a chip. If the book's country is new for this player this season, the final score is multiplied by 1.057.
6. **Season bonuses** (on the leaderboard): genre challenge complete adds 10% of the player's book points. Alphabet 13+ letters adds 6%. All 26 adds 14%. Longest road gives the top 3 flat points: countries 10/7/4, series 8/5/3.
7. **Challenges count only Completed books.** DNF and currently-reading books earn points but don't count toward genre, alphabet, or longest-road challenges.

**Right now, every competition uses the same global scoring config.** Per-competition scoring is designed but not working yet.

**Do not treat these as the source of truth**

- The old design spec at `docs/superpowers/specs/2026-03-11-super-reader-championship-design.md`. It predates reading and DNF statuses, community, managed players, reviews, and sheet import. Its scoring details differ from the code (see the list in Part 2).
- For scoring, use the in-app Rules & Points page for players and `src/lib/scoring.ts` for the engine.

---

## Part 2: Flow reference

Each flow lists who it is for, what triggers it, the steps, and the rules and edge cases. Code pointers are under "Code."

### Player flows

#### 1. Sign up and log in

**Who:** anyone.

**Steps**

1. Signed-out users land on `/login`.
2. New users sign up with display name, email, and password. If email confirmation is on, the app asks them to check their email first.
3. Signed in with no competition: the Welcome screen (`/welcome`), with "Create a Competition" or "Join with Invite Code."
4. Signed in with a competition: `/leaderboard`.

**Forgot password:** request a reset email, follow the link through `/auth/callback`, set a new password on `/reset-password`, then land on `/leaderboard`.

**Rules:** login and signup honor a `redirect` parameter if it starts with `/`. Otherwise they go to `/leaderboard`.

**Code:** `src/lib/actions/auth.ts`, `src/app/(auth)/*`, `src/app/(app)/layout.tsx`, `src/proxy.ts`

#### 2. Create a competition

**Who:** anyone on the Welcome screen (shown when you belong to no competition).

**Steps**

1. Enter a competition name and submit.
2. The app creates the competition, makes you its admin, creates an active "<year> Championship" season, and seeds 8 genres: Mystery/Thriller, Afrofuturism, Fantasy, Romance, Folklore/Mythology, Historical Fiction, Memoir, Weird Fiction.
3. You land on `/leaderboard`. The invite code is in Admin Settings.

**Rules:** new competitions use the global default scoring rules. Creating a competition does not create an org-specific scoring row, and nothing else in the app does either. See Known gaps, item 1.

**Code:** `src/lib/actions/organizations.ts` (`createOrganization`), `src/app/(auth)/welcome/page.tsx`

#### 3. Join with an invite code

**Who:** anyone with a code or invite link.

**Steps**

1. Open `/join/<CODE>`, or on the Welcome screen choose "Join with Invite Code" and enter the code.
2. If not signed in, the app sends you to signup and returns you to the join page afterward.
3. Confirm joining. You are added as a `player` and land on `/leaderboard`.

**Rules and edge cases**

- Codes are case-insensitive. The app uppercases them.
- An unknown code shows "Invalid invite code."
- Already a member: you go straight to `/leaderboard`, with no duplicate membership.
- Regenerating the invite code in Admin Settings replaces the old one (see Admin flow A1).

**Code:** `src/app/(auth)/join/[code]/*`, `src/lib/actions/organizations.ts` (`joinOrganization`)

#### 4. Log a book (the core flow)

**Who:** players, for themselves. Parents, for managed players (see flow 9).

**Trigger:** "Add Book" in the sidebar on desktop, or the global add button on mobile. It opens the Book Entry panel as a bottom sheet on mobile and a dialog on desktop. It is not a separate page.

**Steps**

1. **Find the book.** Search by title or ISBN (Open Library). Or enter a title and author by hand.
2. **Auto-fill.** Pages, year, country, cover, and series fill in when available. Series names from earlier entries in the season are suggested.
3. **Status:** Currently Reading, Completed (default), or DNF. DNF requires pages read.
4. **Classification:** fiction or nonfiction (default fiction), genre from the competition's list, date finished (default today), and rating from 0 to 10 (default 7).
5. **Optional modifiers:** up to 3 bonus chips, one hometown bonus, and one deduction.
6. **Optional review:** text, with visibility set to Private (default) or Public.
7. **Live score:** the preview updates as you change fields and breaks down base, pages, bonuses, deduction, and total.
8. **Save.** The server recalculates the score from the stored scoring config. It does not trust the client's number. It stores the points and runs the flag checks.

**Outcome:** the entry appears in My Books, and the leaderboard updates.

**Rules and edge cases**

- The same book logged twice in one season creates a "duplicate book" flag. The entry still saves.
- If there are at least 3 entries in the season and this entry's points exceed the season mean by more than 2 standard deviations, it gets a "high points" flag. The entry still saves.
- Books are matched by ISBN. A matching ISBN reuses the existing book record, which is shared across competitions. A book with no ISBN creates a new record.
- New country is automatic, based on the player's earlier countries this season. There is no chip for it.
- The live preview is the product's main hook. Keep it fast and keep every field visible in one scroll, as `ui-ux.mdc` requires.

**Code:** `src/components/book-entry-panel.tsx`, `src/components/score-preview.tsx`, `src/lib/actions/books.ts` (`createBookEntry`, `checkAndFlagEntry`), `src/lib/scoring.ts`, `src/lib/books-api.ts`

#### 5. Edit or delete a book entry

**Who:** the entry's owner, the parent of the managed player who owns it, or a competition admin.

**Edit steps:** My Books, tap an entry, the same panel opens prefilled, change fields, save. The score recalculates on save.

**Delete steps:** open the entry, choose delete, confirm. The entry and its flags are removed.

**Rules:** parents and admins write through the service-role client. Non-owners get "Not authorized to modify this entry" otherwise.

**Code:** `src/lib/actions/books.ts` (`updateBookEntry`, `deleteBookEntry`, `requireOwnerOrAdmin`)

#### 6. Leaderboard

**Who:** everyone in the competition.

**What it shows**

- A podium for the top 3, with points, books, and pages.
- A full ranked table: rank, player, books, pages, points. It can be sorted and searched.
- Each row expands to show the breakdown: challenge progress (letters, genres), longest book, highest-point book, and averages.
- Season bonuses and longest-road points are added to the totals.
- Points from currently-reading books are shown as pending, separate from confirmed points.

**Code:** `src/app/(app)/leaderboard/page.tsx`, `src/lib/queries/leaderboard.ts`, `src/components/leaderboard-table.tsx`, `src/components/leaderboard-podium.tsx`

#### 7. Rules & Points

**Who:** everyone. Admins also see an editor for the competition's notes.

**What it shows:** plain-language scoring rules with worked examples, built from the competition's live scoring config. It is the player-facing source of truth for scoring.

**Code:** `src/app/(app)/rules/page.tsx`, `src/components/rules-points-view.tsx`

#### 8. My Books

**Who:** players, for their own entries in the active season.

**What it shows:** a searchable, sortable list. Each row shows title, pages, genre, date finished, points, and rating. Sort options are newest, points, rating, and title. Tapping a row opens the edit panel (flow 5).

**Other players:** `/player/[userId]` shows another player's books and profile (about text, Goodreads and StoryGraph links).

**Code:** `src/app/(app)/my-books/page.tsx`, `src/components/player-books-view.tsx`, `src/app/(app)/player/[userId]/page.tsx`

#### 9. Parent logs books for a managed player

**Who:** a parent (a player with a managed-player link). Admins can also create and link managed players.

**Steps**

1. **Create:** the parent enters a display name. The app creates a profile with a placeholder email and no usable password. The managed player joins the competition as a player.
2. **Log:** in the Book Entry panel, the parent picks the managed player as the entry's owner. Everything in flow 4 applies. The entry belongs to the managed player.
3. **Promote (optional):** when the child gets their own account, a parent or admin sets a real email. An admin then generates a password-reset invite link and sends it to the player. The player sets a password and logs in as themselves.
4. **Unlink:** a parent or admin can unlink. This removes the parent relationship only. The player and their entries stay.

**Rules**

- A player cannot be their own parent.
- Circular parent links are rejected.
- Invite links require a real email. Placeholder emails are rejected.

**Code:** `src/lib/actions/managed-players.ts`, `src/lib/actions/admin.ts` (`generatePlayerInvite`), `src/components/managed-players-settings.tsx`, `src/components/managed-player-tabs.tsx`

#### 10. Review a book

**Who:** the entry owner, or a parent for a managed player.

**Steps:** in the book panel, write the review (up to 5000 characters), choose Private or Public, save. Reviews are one per book entry.

**Rules:** an admin can set any review to private (`adminSetReviewPrivate`).

**Code:** `src/lib/actions/reviews.ts`

#### 11. Community feed

**Who:** members of the competition.

**Steps**

1. **Post:** write up to 4000 characters, optionally pick a tag (Recommendation, Rules, Leaderboard, Milestone, General), and attach up to 4 images.
2. **Comment:** threaded replies, up to 2000 characters, up to 2 images per comment.
3. **React:** any emoji, on posts or comments. Tap again to remove.
4. **Edit or delete:** authors can edit or delete their own posts and comments. Admins can delete any post, comment, or reaction in the competition.

**Rules**

- A deleted comment stays as a placeholder, so its replies stay attached.
- Older posts load on demand.
- Images are stored per competition. Other competitions cannot read them.

**Code:** `src/app/(app)/community/*`, `src/lib/actions/community.ts`, `src/lib/queries/community.ts`, `supabase/migrations/010_community.sql`

#### 12. Switch competitions

**Who:** users who belong to more than one competition.

**Steps:** open the org switcher in the sidebar and pick a competition. The app stores your choice, then loads the active season, genres, and managed players for that competition.

**Code:** `src/components/org-switcher.tsx`, `src/lib/actions/organizations.ts` (`switchOrg`)

#### 13. Account settings

**Who:** everyone, for their own account.

**What you can change:** display name, about text, Goodreads and StoryGraph links, default view (simple, default, or detail), theme (light, dark, or system), and password.

**What you can't change:** email. Admins change emails from the Players page.

**Code:** `src/app/(app)/settings/page.tsx`, `src/lib/actions/profile.ts`

#### 14. Forgot password

Covered in flow 1.

---

### Admin flows

Admin pages live under `/admin/*`: Settings, Players, Genres, Scoring, Flagged, Import. Only admins see them.

#### A1. Competition settings

- **Rename** the competition.
- **Invite code:** view it, or regenerate it. Regenerating replaces the old code, so old links stop working.
- **Organization notes:** free text shown on the Rules & Points page.
- **Delete competition:** in the danger zone. You must type the competition name to confirm.

**Code:** `src/components/admin-settings.tsx`, `src/components/danger-zone.tsx`, `src/lib/actions/organizations.ts`, `src/lib/actions/admin.ts` (`updateOrgNotes`, `deleteOrganization`)

#### A2. Players and roles

- **List members.** Each member shows their role.
- **Change role** between admin and player. You cannot demote the last admin.
- **Remove a member.** You cannot remove yourself or the last admin.
- **Edit a player's name or email.** Email changes take effect right away.
- **Generate an invite link** for a player with a real email (flow 9, step 3).
- **Link managed players:** pick a parent and a child who are both members.

**Code:** `src/components/player-manager.tsx`, `src/app/(app)/admin/players/page.tsx`, `src/lib/actions/admin.ts`, `src/lib/actions/managed-players.ts`

#### A3. Genres

- **Add, reorder, or remove** genres. The genre list is the genre challenge, so changes change what a player needs to complete it.

**Code:** `src/components/genre-manager.tsx`, `src/lib/actions/admin.ts` (`addGenre`, `reorderGenres`, `removeGenre`)

#### A4. Scoring rules

- **Edit the config:** base points, page rates, bonus percentages, hometown bonuses, deduction multipliers, season bonuses, and longest-road points.
- **Saving does not rewrite existing entries.** The app tells you how many entries exist, and you run **Recalculate** to apply the new rules to them. Recalculate asks for confirmation first.
- Changing rules mid-season affects everyone's standings immediately after recalculation. Warn the group before you do it.
- **Known bug (unverified against the live database):** the editor loads the global default row for every competition, and the save updates that row by id. Row-level security should block the update, and the action doesn't check how many rows changed, so the save may report success while changing nothing. Test this before relying on the scoring editor. See Known gaps, item 1.

**Code:** `src/components/scoring-editor.tsx`, `src/app/(app)/admin/scoring/page.tsx`, `src/lib/actions/admin.ts` (`updateScoringRules`, `recalculateSeasonPoints`)

#### A5. Flagged entries

- The Flagged page lists unresolved flags with their reason: "high points" or "duplicate book."
- Open an entry and **resolve** the flag once you've checked it.
- Resolving marks the flag done. It does not change the entry's points or delete it.

**Code:** `src/components/flagged-list.tsx`, `src/components/flagged-entry-card.tsx`, `src/lib/actions/admin.ts` (`resolveFlaggedEntry`)

#### A6. Import from Google Sheets

The old spreadsheet can be imported.

1. Save the sheet URL in Import.
2. Preview the import. The app reads each player's tab, which must be named after the player and have the expected columns: title, pages, genre, country, and rating. It matches tabs to members.
3. Confirm the import. Books with an ISBN are looked up on Open Library for covers and authors. Lookups are rate-limited, so large imports take a while.

**Code:** `src/components/import-manager.tsx`, `src/lib/actions/import.ts`, `src/lib/sheet-import.ts`, `src/lib/books-api.ts`

#### A7. Seasons

- **Start a new season:** the active season is archived with today as its end date, and a new active season is created.
- **Archive the current season** on its own. The competition then has no active season until you start one.
- Archived seasons stay readable.

**Code:** `src/components/season-manager.tsx`, `src/lib/actions/admin.ts` (`createNewSeason`, `archiveSeason`)

---

## Known gaps and open questions

These came up while writing this doc. Decide them before the voice session.

1. **Per-competition scoring is not working.** The schema supports org-specific scoring rules, but nothing in the app creates them. Every competition uses the one global row from `supabase/seed.sql`. The admin scoring editor's save targets that global row. RLS should block it (only org-scoped rows are admin-writable), and `updateScoringRules` doesn't check the affected row count, so the admin may see "saved" with no change. Confirm against the live database. If it's confirmed, either create the org row at competition creation or make the save fail loudly. Note that a successful write to the global row would change scoring for every competition.
2. **New-country bonus:** the spec says it is a player-declared chip on an honor system. The code applies it automatically, based on the player's earlier countries this season. Confirm which one you want.
3. **Currently Reading earns full points immediately:** base points and full page count count right away, shown as pending. Confirm this is intended, or whether it should wait until completion.
4. **The old spec is stale:** `docs/superpowers/specs/2026-03-11-super-reader-championship-design.md` predates reading and DNF statuses, community, managed players, reviews, and sheet import. Its scoring details differ from the code: page rounding to 50, bonus chips zeroed by a deduction, and the new-country behavior above. Consider updating it or marking it as historical.
5. **No progress page:** the spec lists a My Progress page. The current app has no such route. Challenge progress shows on the leaderboard and on player profiles instead.
