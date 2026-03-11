# Super Reader Championship — Application Design Spec

## Overview

A multi-tenant web application that replaces a Google Sheets-based reading competition tracker. Players log books they've read, earn points based on a complex scoring formula, and compete on a leaderboard. Each group of friends (organization) runs their own independent competition with yearly seasons.

## Goals

- Replace the spreadsheet with a polished, mobile-friendly web app
- Support multiple independent groups running their own competitions
- Preserve the fun, gamified experience — especially the live score feedback during book entry
- Start with core features (leaderboard, book entry, book list) and iterate

## Non-Goals (for now)

- Per-organization custom scoring rules (design for it, don't build it yet)
- Favorites/reviews feature
- Season history / past winners archive
- Refined flagged-entry criteria

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) with TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres + Auth + RLS) |
| Book Lookup | Open Library API (free, no key) |
| Hosting | Vercel (free tier) |

---

## Data Model

### `users`

Managed by Supabase Auth. Email + password authentication.

### `profiles`

Extended user info linked to Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users |
| display_name | text | Player's display name |
| created_at | timestamptz | |

### `organizations`

A group that runs competitions. Fully isolated (multi-tenant).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | e.g., "Kody's Book Club" |
| invite_code | text | Unique, shareable join code |
| created_at | timestamptz | |

### `org_members`

Links users to organizations with a role.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK to organizations |
| user_id | uuid | FK to auth.users |
| role | text | `admin` or `player` |
| joined_at | timestamptz | |

Unique constraint on (org_id, user_id). A user can be in multiple orgs.

### `seasons`

A competition period within an org.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK to organizations |
| name | text | e.g., "2026 Championship" |
| status | text | `active` or `archived` |
| start_date | date | |
| end_date | date | Nullable |
| created_at | timestamptz | |

One active season per org at a time.

### `books`

Shared reference table of book metadata. Populated via Open Library API lookup. Shared across all orgs to avoid duplicate ISBN lookups.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| isbn | text | Nullable (not all books have ISBN) |
| title | text | |
| author | text | |
| pages | integer | |
| year_published | integer | |
| country | text | Author's country of origin |
| cover_url | text | Nullable, from Open Library |
| created_at | timestamptz | |

Unique constraint on isbn (where not null).

### `book_entries`

One row per player-per-book-per-season. The core of the app.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| season_id | uuid | FK to seasons |
| user_id | uuid | FK to auth.users |
| book_id | uuid | FK to books |
| completed | boolean | Whether the book was finished |
| fiction | boolean | true = Fiction, false = Nonfiction |
| series_name | text | Nullable, name of the series |
| genre | text | From org's genre list |
| date_finished | date | Nullable if not completed |
| rating | decimal | 0-10 scale, supports half points |
| hometown_bonus | text | Nullable. One of: 'state_setting', 'state_name', 'city_name' |
| bonus_1 | text | Nullable. Bonus type key |
| bonus_2 | text | Nullable. Bonus type key |
| bonus_3 | text | Nullable. Bonus type key |
| deduction | text | Nullable. Deduction type key |
| points | decimal | Computed and stored on save |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS policy: users can only read entries within their org's seasons, and only write their own entries.

### `genres`

Configurable per-org. Defines the genre challenge list.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK to organizations |
| name | text | e.g., "Mystery/Thriller" |
| sort_order | integer | Display ordering |

Default genres seeded on org creation: Mystery/Thriller, Afrofuturism, Fantasy, Romance, Folklore/Mythology, Historical Fiction, Memoir, Weird Fiction.

### `scoring_rules`

Single row storing all scoring constants. Later becomes per-org.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| config | jsonb | All point values, bonus %, deduction multipliers |
| updated_at | timestamptz | |

---

## Scoring Engine

A pure function shared between client (live preview) and server (validation on save). All constants read from `scoring_rules`.

### Per-Book Score

1. **Base Points:** Fiction = 0.71, Nonfiction = 1.26

2. **Page Points:**
   - First 100 pages: `min(pages, 100) × 0.0028`
   - Pages beyond 100: `max(pages - 100, 0) × 0.01`

3. **Pre-Bonus Total** = Base + Page Points

4. **Bonus Multipliers** (each adds a % of pre-bonus total):
   - Classics 1900-Present: +7.2%
   - 1750-1900: +14.3%
   - Before 1750: +28.6%
   - Series: +14.3%
   - Translation: +5.7%
   - Birth Year: +2.9%
   - Current Year: +5.7%
   - Relatable Holiday/Event: +2.9%
   - Award Winner: +5.7%
   - New (Unique) Country: +5.7%
   - Hometown — Set in State: +2.9%
   - Hometown — State name in title: +0.29%
   - Hometown — City name in title: +0.58%

5. **Deduction Multipliers** (multiply the running total):
   - Graphic Novel: ×0.3
   - Comics/Manga: ×0.2
   - Audiobook: ×0.75
   - Re-read: ×0.5
   - Audiobook Re-read: ×0.25

### Season-Level Bonuses (calculated at leaderboard render time)

6. **Completion Bonuses** (% of player's sum of pre-bonus points):
   - Genre challenge complete (all genres covered): +10%
   - Alphabet challenge 13+ letters: +6%
   - Alphabet challenge all 26 letters: +14%

7. **"Longest Road" Bonuses** (flat points, top 3 across all players):
   - Most unique countries: 10 / 7 / 4 pts
   - Longest series read: 8 / 5 / 3 pts

### Implementation

- `calculateBookScore(entry, scoringRules)` — pure function, returns per-book points
- `calculateSeasonBonuses(allEntries, scoringRules)` — computes completion and longest-road bonuses per player
- `calculateLeaderboard(allEntries, scoringRules)` — combines per-book scores + season bonuses, returns ranked list

---

## Auth & Multi-Tenancy

### Authentication

- Supabase Auth with email + password
- New users land on a "Join or Create a Competition" screen
- No data is visible until a user belongs to an org

### Creating a Competition

1. Admin enters competition name
2. System creates org + first season (named after current year) + seeds default genres
3. Admin gets an invite link/code to share

### Joining a Competition

1. Player clicks invite link or enters join code
2. Signs up or logs in
3. Automatically added to the org as a `player`
4. Lands on the leaderboard

### Switching Orgs

If a user belongs to multiple orgs, a dropdown in the sidebar/header allows switching between them.

### Row-Level Security

All data access goes through Supabase RLS policies:
- Users can only read data within their org's scope
- Users can only write their own book entries
- Admin-only tables (scoring_rules, genres) restricted by role check

### Roles

- **admin** — manage scoring rules, genre lists, invite/remove players, review flagged entries, manage seasons
- **player** — add/edit own book entries, view leaderboard, view own progress

---

## Screens & Navigation

### Navigation

- **Desktop:** Collapsible sidebar with labeled navigation items
- **Mobile:** Bottom tab bar with icon tabs
- Responsive breakpoint switches between the two

### Global Add Book Action

A persistent "+" / "Add Book" button accessible from any screen. Opens a **slide-over panel** (or modal overlay) on top of the current page. When closed, the user returns to whatever page they were viewing. This is not a dedicated route.

### Must-Have Screens

#### Leaderboard

- **Podium hero** at top showcasing 1st, 2nd, 3rd place with trophy/medal icons, point totals, and book/page counts
- **Full ranked table** below includes all players (including top 3 again)
- Top 3 rows have subtle colored backgrounds (gold, blue, bronze tints)
- Current user's row highlighted with indigo accent bar
- Table columns: Rank, Player, Books, Pages, Points

#### My Books

- Searchable, sortable list of the current user's book entries for the active season
- Each row shows: book title, page count, genre, date finished, points earned, rating
- Sort options: newest first, points, rating, title
- Click a book to view/edit the entry

#### Add Book (Slide-Over Panel)

- **Search bar** at top: search by title or ISBN
- **Auto-filled book details** from Open Library API: pages, year published, country, fiction/nonfiction
- **Competition fields** filled by user: completed status, series name, genre (from org's list), date finished, rating (0-10)
- **Bonuses section:** selectable bonus chips (up to 3), hometown bonus dropdown
- **Deductions section:** selectable deduction chip (one)
- **Live score card** (sticky, always visible): shows estimated points with breakdown (base, pages, bonuses, deductions). Updates in real-time as the user toggles options.

#### Admin Settings (admin role only)

- **Competition Settings:** name, current season, invite link management
- **Players:** member list, invite by email, remove players, change roles
- **Genres:** view/add/remove/reorder genre challenge list
- **Scoring Rules:** editable form for all point values, bonus percentages, deduction multipliers
- **Seasons:** archive current season, start new one
- **Flagged Entries:** entries with unusually high points or duplicate books surfaced for admin review

### Should-Have Screens

#### My Progress

- **Genre challenge:** grid showing which genres the player has covered, with completion percentage
- **Alphabet challenge:** A-Z grid showing which letters are filled
- **Country map/list:** unique countries read from
- **Season stats:** total books, total pages, average rating

---

## Visual Design

**Style:** Clean & Modern — light backgrounds, indigo/purple accent colors (#6366f1, #8b5cf6), rounded elements, subtle shadows. Professional but playful, like a polished SaaS product.

**Key design elements:**
- White card-based layouts on light gray (#f8f9ff) backgrounds
- Indigo as primary accent color for points, highlights, active states
- Green chips for bonuses, red chips for deductions
- Trophy/medal emojis for leaderboard top 3
- Responsive: optimized for both mobile and desktop

---

## Project Structure

```
src/
  app/
    (auth)/                 # Login, signup, join-by-invite flows
      login/
      signup/
      join/[code]/
    (app)/                  # Authenticated app shell
      layout.tsx            # Sidebar (desktop) / bottom tabs (mobile)
      leaderboard/
      my-books/
      progress/
      admin/
        settings/
        players/
        genres/
        scoring/
        seasons/
        flagged/
  components/
    ui/                     # shadcn/ui components
    add-book-panel.tsx      # Global slide-over for adding books
    leaderboard-table.tsx
    book-entry-card.tsx
    score-preview.tsx       # Live score breakdown card
    nav-sidebar.tsx
    nav-bottom-tabs.tsx
  lib/
    scoring.ts              # Pure scoring functions (shared client/server)
    supabase/
      client.ts             # Browser Supabase client
      server.ts             # Server Supabase client
      middleware.ts          # Auth middleware
    books-api.ts            # Open Library API integration
  types/
    database.ts             # TypeScript types generated from Supabase schema
```

---

## Open Questions (Deferred)

- Exact criteria for flagged entries (beyond high points / duplicates)
- Per-org custom scoring rules
- Favorites/reviews feature
- Season history / past winners display
- Refined competition creation flow with genre customization step
- Social features (comments, reactions to book entries)
