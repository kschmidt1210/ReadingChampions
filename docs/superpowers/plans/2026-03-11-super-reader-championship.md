# Super Reader Championship Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant reading competition web app that replaces a Google Sheets tracker, with leaderboard, book entry with live scoring, and admin management.

**Architecture:** Next.js 14 App Router with Supabase for auth, database (Postgres + RLS), and hosting on Vercel. Pure scoring engine shared between client and server. Open Library API for book metadata lookup.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth + RLS), Open Library API, Vercel

---

## File Structure

```
src/
  app/
    layout.tsx                          # Root layout with font + providers
    page.tsx                            # Landing redirect (to /leaderboard or /login)
    globals.css                         # Tailwind base styles
    (auth)/
      layout.tsx                        # Centered card layout for auth pages
      login/page.tsx                    # Email+password login form
      signup/page.tsx                   # Registration form
      join/[code]/page.tsx              # Invite code join flow
    (app)/
      layout.tsx                        # App shell: sidebar (desktop) + bottom tabs (mobile) + add book FAB
      leaderboard/page.tsx              # Leaderboard with podium hero + ranked table
      my-books/page.tsx                 # User's book entries list
      progress/page.tsx                 # Genre/alphabet/country challenge progress
      admin/
        layout.tsx                      # Admin sub-nav layout
        settings/page.tsx               # Competition name, invite link, season management
        players/page.tsx                # Member list, invite, remove, role changes
        genres/page.tsx                 # Genre challenge list management
        scoring/page.tsx                # Scoring rules editor
        flagged/page.tsx                # Flagged entries review
  components/
    ui/                                 # shadcn/ui components (auto-generated)
    providers.tsx                       # Client providers (Supabase, org context)
    add-book-panel.tsx                  # Global slide-over panel for adding/editing books
    book-search.tsx                     # Open Library search bar with results
    score-preview.tsx                   # Live score breakdown card (sticky in add-book)
    leaderboard-podium.tsx              # Top 3 podium hero cards
    leaderboard-table.tsx               # Full ranked player table
    book-entry-card.tsx                 # Single book entry row in my-books list
    bonus-chips.tsx                     # Selectable bonus chip group (up to 3)
    deduction-chips.tsx                 # Selectable deduction chip (one)
    nav-sidebar.tsx                     # Desktop sidebar navigation
    nav-bottom-tabs.tsx                 # Mobile bottom tab bar
    org-switcher.tsx                    # Organization dropdown switcher
    genre-grid.tsx                      # Genre challenge progress grid
    alphabet-grid.tsx                   # Alphabet challenge A-Z grid
  lib/
    scoring.ts                          # Pure scoring functions (calculateBookScore, calculateSeasonBonuses, calculateLeaderboard)
    scoring-types.ts                    # Scoring type definitions and bonus/deduction key enums
    books-api.ts                        # Open Library API integration
    supabase/
      client.ts                         # Browser Supabase client (createBrowserClient)
      server.ts                         # Server Supabase client (createServerClient)
      middleware.ts                      # Auth middleware for protected routes
    actions/
      auth.ts                           # Server actions: login, signup, logout
      organizations.ts                  # Server actions: create org, join org, manage members
      books.ts                          # Server actions: search/create books, create/update entries
      admin.ts                          # Server actions: scoring rules, genres, seasons, flagged entries
    queries/
      leaderboard.ts                    # Leaderboard data fetching + season bonus calculation
      books.ts                          # Book entries queries (user's books, entry details)
      organizations.ts                  # Org membership, season queries
      admin.ts                          # Admin-specific queries (flagged entries, member list)
  types/
    database.ts                         # TypeScript types matching Supabase schema
  middleware.ts                         # Next.js middleware (auth redirect)
supabase/
  migrations/
    001_initial_schema.sql              # All tables, RLS policies, functions
  seed.sql                              # Default scoring rules row
```

---

## Chunk 1: Project Scaffolding & Database

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create Next.js project**

```bash
cd "/Users/kody/reading app"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This scaffolds the project with App Router, TypeScript, Tailwind, and ESLint.

- [ ] **Step 2: Verify project runs**

```bash
npm run dev
```

Expected: Dev server starts on localhost:3000 with the default Next.js page.

- [ ] **Step 3: Clean up default content**

Replace `src/app/page.tsx` with:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">Super Reader Championship</h1>
    </main>
  );
}
```

Remove default CSS from `src/app/globals.css` except Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with TypeScript and Tailwind"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase client libraries**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Install shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 3: Install commonly needed shadcn components**

```bash
npx shadcn@latest add button input label card dialog sheet dropdown-menu table badge tabs separator avatar select command popover form toast
```

- [ ] **Step 4: Install additional utilities**

```bash
npm install lucide-react date-fns zod
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: install Supabase, shadcn/ui, and utility dependencies"
```

---

### Task 3: Configure Supabase Environment

**Files:**
- Create: `.env.local` (NOT committed)
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add env vars to .gitignore**

Append to `.gitignore`:

```
.env*.local
```

- [ ] **Step 2: Create .env.local with Supabase credentials**

```bash
cat > "/Users/kody/reading app/.env.local" << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF
```

**⚠️ Pause here:** Replace these with real values from your Supabase project dashboard (Settings → API → Project URL and anon/public key). The remaining tasks require a working Supabase connection.

- [ ] **Step 3: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create server Supabase client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Create Supabase middleware helper**

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except auth pages)
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/join");

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage && !request.nextUrl.pathname.startsWith("/join")) {
    const url = request.nextUrl.clone();
    url.pathname = "/leaderboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 6: Create Next.js middleware**

Create `src/middleware.ts`:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts .gitignore
git commit -m "feat: configure Supabase client, server client, and auth middleware"
```

---

### Task 4: Database Schema Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migration file with all tables**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles: extended user info linked to Supabase Auth
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- organizations: a group that runs competitions
-- ============================================================
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- Function to generate invite codes (8 chars, uppercase + digits, no ambiguous chars)
create or replace function public.generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- ============================================================
-- org_members: links users to organizations with a role
-- ============================================================
create table public.org_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'player' check (role in ('admin', 'player')),
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ============================================================
-- seasons: a competition period within an org
-- ============================================================
create table public.seasons (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now()
);

-- Only one active season per org at a time
create unique index seasons_one_active_per_org on public.seasons (org_id) where status = 'active';

-- ============================================================
-- genres: configurable per-org genre challenge list
-- ============================================================
create table public.genres (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

-- ============================================================
-- books: shared reference table of book metadata
-- ============================================================
create table public.books (
  id uuid primary key default uuid_generate_v4(),
  isbn text,
  title text not null,
  author text not null,
  pages integer not null,
  year_published integer,
  country text,
  cover_url text,
  created_at timestamptz not null default now()
);

create unique index books_isbn_unique on public.books (isbn) where isbn is not null;

-- ============================================================
-- book_entries: one row per player-per-book-per-season
-- ============================================================
create table public.book_entries (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid not null references public.seasons on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  book_id uuid not null references public.books on delete cascade,
  completed boolean not null default true,
  fiction boolean not null default true,
  series_name text,
  genre_id uuid references public.genres on delete set null,
  date_finished date,
  rating numeric(3,1) check (rating >= 0 and rating <= 10),
  hometown_bonus text check (hometown_bonus in ('state_setting', 'state_name', 'city_name')),
  bonus_1 text check (bonus_1 in ('classics_1900', 'classics_1750', 'classics_pre1750', 'series', 'translation', 'birth_year', 'current_year', 'holiday_event', 'award_winner', 'new_country')),
  bonus_2 text check (bonus_2 in ('classics_1900', 'classics_1750', 'classics_pre1750', 'series', 'translation', 'birth_year', 'current_year', 'holiday_event', 'award_winner', 'new_country')),
  bonus_3 text check (bonus_3 in ('classics_1900', 'classics_1750', 'classics_pre1750', 'series', 'translation', 'birth_year', 'current_year', 'holiday_event', 'award_winner', 'new_country')),
  deduction text check (deduction in ('graphic_novel', 'comics_manga', 'audiobook', 'reread', 'audiobook_reread')),
  points decimal not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- scoring_rules: stores all scoring constants
-- ============================================================
create table public.scoring_rules (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references public.organizations on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- flagged_entries: entries flagged for admin review
-- ============================================================
create table public.flagged_entries (
  id uuid primary key default uuid_generate_v4(),
  book_entry_id uuid not null references public.book_entries on delete cascade,
  reason text not null,
  resolved boolean not null default false,
  resolved_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Profiles: users can read any profile, update only their own
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Organizations: members can read their own orgs
alter table public.organizations enable row level security;

create policy "Org members can view their orgs, or look up by invite code"
  on public.organizations for select
  to authenticated
  using (
    id in (select org_id from public.org_members where user_id = auth.uid())
    or invite_code is not null  -- allows lookup by invite_code filter; RLS permits row visibility but only invite_code queries will match non-member orgs
  );

create policy "Authenticated users can create organizations"
  on public.organizations for insert
  to authenticated
  with check (true);

create policy "Admins can update their organizations"
  on public.organizations for update
  to authenticated
  using (
    id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Org members: members can see other members in their orgs
alter table public.org_members enable row level security;

create policy "Members can view members of their orgs"
  on public.org_members for select
  to authenticated
  using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "Authenticated users can join orgs"
  on public.org_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Admins can manage org members"
  on public.org_members for delete
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update org member roles"
  on public.org_members for update
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Seasons: visible to org members
alter table public.seasons enable row level security;

create policy "Org members can view seasons"
  on public.seasons for select
  to authenticated
  using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "Admins can manage seasons"
  on public.seasons for all
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Genres: visible to org members, manageable by admins
alter table public.genres enable row level security;

create policy "Org members can view genres"
  on public.genres for select
  to authenticated
  using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "Admins can manage genres"
  on public.genres for all
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Books: readable by all authenticated, insertable by all
alter table public.books enable row level security;

create policy "Books are viewable by authenticated users"
  on public.books for select
  to authenticated
  using (true);

create policy "Authenticated users can insert books"
  on public.books for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update books"
  on public.books for update
  to authenticated
  using (true);

-- Book entries: read within org scope, write own
alter table public.book_entries enable row level security;

create policy "Users can view entries in their org seasons"
  on public.book_entries for select
  to authenticated
  using (
    season_id in (
      select s.id from public.seasons s
      join public.org_members om on om.org_id = s.org_id
      where om.user_id = auth.uid()
    )
  );

create policy "Users can insert their own entries"
  on public.book_entries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own entries"
  on public.book_entries for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users can delete their own entries"
  on public.book_entries for delete
  to authenticated
  using (user_id = auth.uid());

-- Scoring rules: readable by org members, writable by admins
alter table public.scoring_rules enable row level security;

create policy "Global scoring rules readable by all authenticated"
  on public.scoring_rules for select
  to authenticated
  using (org_id is null or org_id in (
    select org_id from public.org_members where user_id = auth.uid()
  ));

create policy "Admins can manage org scoring rules"
  on public.scoring_rules for all
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Flagged entries: visible to admins of the entry's org
alter table public.flagged_entries enable row level security;

create policy "Admins can view flagged entries in their orgs"
  on public.flagged_entries for select
  to authenticated
  using (
    book_entry_id in (
      select be.id from public.book_entries be
      join public.seasons s on s.id = be.season_id
      join public.org_members om on om.org_id = s.org_id
      where om.user_id = auth.uid() and om.role = 'admin'
    )
  );

create policy "System can insert flagged entries"
  on public.flagged_entries for insert
  to authenticated
  with check (true);

create policy "Admins can update flagged entries"
  on public.flagged_entries for update
  to authenticated
  using (
    book_entry_id in (
      select be.id from public.book_entries be
      join public.seasons s on s.id = be.season_id
      join public.org_members om on om.org_id = s.org_id
      where om.user_id = auth.uid() and om.role = 'admin'
    )
  );
```

- [ ] **Step 2: Apply the migration**

Go to your Supabase project dashboard → SQL Editor. Copy the contents of `supabase/migrations/001_initial_schema.sql` and run it. Verify all statements succeed with no errors. If you're using the Supabase CLI locally, run:

```bash
npx supabase db push
```

Expected: All tables, indexes, functions, triggers, and RLS policies created without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema migration with RLS policies"
```

---

### Task 5: Seed Default Scoring Rules

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create seed file with default scoring rules**

Create `supabase/seed.sql`:

```sql
-- Default global scoring rules (org_id = NULL)
insert into public.scoring_rules (org_id, config) values (
  null,
  '{
    "base_points": {
      "fiction": 0.71,
      "nonfiction": 1.26
    },
    "page_points": {
      "first_100_rate": 0.0028,
      "beyond_100_rate": 0.01
    },
    "bonuses": {
      "classics_1900": 0.072,
      "classics_1750": 0.143,
      "classics_pre1750": 0.286,
      "series": 0.143,
      "translation": 0.057,
      "birth_year": 0.029,
      "current_year": 0.057,
      "holiday_event": 0.029,
      "award_winner": 0.057,
      "new_country": 0.057
    },
    "hometown_bonuses": {
      "state_setting": 0.029,
      "state_name": 0.0029,
      "city_name": 0.0058
    },
    "deductions": {
      "graphic_novel": 0.3,
      "comics_manga": 0.2,
      "audiobook": 0.75,
      "reread": 0.5,
      "audiobook_reread": 0.25
    },
    "season_bonuses": {
      "genre_complete_pct": 0.10,
      "alphabet_13_pct": 0.06,
      "alphabet_26_pct": 0.14
    },
    "longest_road": {
      "countries": [10, 7, 4],
      "series": [8, 5, 3]
    }
  }'::jsonb
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: add default scoring rules seed data"
```

---

### Task 6: TypeScript Database Types

**Files:**
- Create: `src/types/database.ts`

- [ ] **Step 1: Create TypeScript types matching the schema**

Create `src/types/database.ts`:

```ts
export type Role = "admin" | "player";
export type SeasonStatus = "active" | "archived";

export type BonusKey =
  | "classics_1900"
  | "classics_1750"
  | "classics_pre1750"
  | "series"
  | "translation"
  | "birth_year"
  | "current_year"
  | "holiday_event"
  | "award_winner"
  | "new_country";

export type DeductionKey =
  | "graphic_novel"
  | "comics_manga"
  | "audiobook"
  | "reread"
  | "audiobook_reread";

export type HometownBonusKey = "state_setting" | "state_name" | "city_name";

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
}

export interface Season {
  id: string;
  org_id: string;
  name: string;
  status: SeasonStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface Genre {
  id: string;
  org_id: string;
  name: string;
  sort_order: number;
}

export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  author: string;
  pages: number;
  year_published: number | null;
  country: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface BookEntry {
  id: string;
  season_id: string;
  user_id: string;
  book_id: string;
  completed: boolean;
  fiction: boolean;
  series_name: string | null;
  genre_id: string | null;
  date_finished: string | null;
  rating: number | null;
  hometown_bonus: HometownBonusKey | null;
  bonus_1: BonusKey | null;
  bonus_2: BonusKey | null;
  bonus_3: BonusKey | null;
  deduction: DeductionKey | null;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface ScoringRulesConfig {
  base_points: { fiction: number; nonfiction: number };
  page_points: { first_100_rate: number; beyond_100_rate: number };
  bonuses: Record<BonusKey, number>;
  hometown_bonuses: Record<HometownBonusKey, number>;
  deductions: Record<DeductionKey, number>;
  season_bonuses: {
    genre_complete_pct: number;
    alphabet_13_pct: number;
    alphabet_26_pct: number;
  };
  longest_road: {
    countries: [number, number, number];
    series: [number, number, number];
  };
}

export interface ScoringRules {
  id: string;
  org_id: string | null;
  config: ScoringRulesConfig;
  updated_at: string;
}

export interface FlaggedEntry {
  id: string;
  book_entry_id: string;
  reason: string;
  resolved: boolean;
  resolved_by: string | null;
  created_at: string;
}

// Joined types for UI convenience
export interface BookEntryWithBook extends BookEntry {
  book: Book;
}

export interface LeaderboardPlayer {
  user_id: string;
  display_name: string;
  total_points: number;
  book_count: number;
  page_count: number;
  rank: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript database types and scoring enums"
```

---

---

## Chunk 2: Auth & Organization Management

### Task 7: Auth Pages — Login

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/lib/actions/auth.ts`

- [ ] **Step 1: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create auth server actions**

Create `src/lib/actions/auth.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/leaderboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const displayName = formData.get("displayName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/leaderboard";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 3: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { login } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">📚 Super Reader Championship</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 4: Verify login page renders**

```bash
npm run dev
```

Navigate to `localhost:3000/login`. Expected: centered card with email/password form.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/ src/lib/actions/auth.ts
git commit -m "feat: add auth layout, login page, and auth server actions"
```

---

### Task 8: Auth Pages — Signup

**Files:**
- Create: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Create signup page**

Create `src/app/(auth)/signup/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signup } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">📚 Create Your Account</CardTitle>
        <CardDescription>
          Join the Super Reader Championship
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              name="displayName"
              required
              placeholder="How others will see you"
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: Verify signup page renders**

```bash
npm run dev
```

Navigate to `localhost:3000/signup`. Expected: centered card with display name, email, and password fields, plus a "Sign in" link.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/signup/
git commit -m "feat: add signup page"
```

---

### Task 9: Organization Actions — Create & Join

**Files:**
- Create: `src/lib/actions/organizations.ts`
- Create: `src/app/(auth)/join/[code]/page.tsx`

- [ ] **Step 1: Create organization server actions**

Create `src/lib/actions/organizations.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const DEFAULT_GENRES = [
  "Mystery/Thriller",
  "Afrofuturism",
  "Fantasy",
  "Romance",
  "Folklore/Mythology",
  "Historical Fiction",
  "Memoir",
  "Weird Fiction",
];

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;

  // Generate unique invite code
  const { data: inviteCode } = await supabase.rpc("generate_invite_code");

  // Create org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, invite_code: inviteCode })
    .select()
    .single();

  if (orgError) return { error: orgError.message };

  // Add creator as admin
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) return { error: memberError.message };

  // Create first season
  const currentYear = new Date().getFullYear();
  const { error: seasonError } = await supabase.from("seasons").insert({
    org_id: org.id,
    name: `${currentYear} Championship`,
    status: "active",
  });

  if (seasonError) return { error: seasonError.message };

  // Seed default genres
  const genreRows = DEFAULT_GENRES.map((name, i) => ({
    org_id: org.id,
    name,
    sort_order: i,
  }));

  const { error: genreError } = await supabase
    .from("genres")
    .insert(genreRows);

  if (genreError) return { error: genreError.message };

  revalidatePath("/", "layout");
  redirect("/leaderboard");
}

export async function joinOrganization(inviteCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Look up org by invite code
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();

  if (orgError || !org) return { error: "Invalid invite code" };

  // Check if already a member
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    redirect("/leaderboard");
  }

  // Join as player
  const { error: joinError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "player",
  });

  if (joinError) return { error: joinError.message };

  revalidatePath("/", "layout");
  redirect("/leaderboard");
}

export async function regenerateInviteCode(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify caller is an admin of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Only admins can regenerate invite codes" };
  }

  const { data: newCode } = await supabase.rpc("generate_invite_code");

  const { error } = await supabase
    .from("organizations")
    .update({ invite_code: newCode })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { invite_code: newCode };
}
```

- [ ] **Step 2: Create join-by-invite-code page**

Create `src/app/(auth)/join/[code]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinForm } from "./join-form";

export default async function JoinPage({
  params,
}: {
  params: { code: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, redirect to signup with return URL
  if (!user) {
    redirect(`/signup?redirect=/join/${params.code}`);
  }

  return <JoinForm code={params.code} />;
}
```

Create `src/app/(auth)/join/[code]/join-form.tsx`:

```tsx
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
        <CardTitle className="text-2xl">📚 Join a Competition</CardTitle>
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/organizations.ts src/app/\(auth\)/join/
git commit -m "feat: add create/join organization actions and join page"
```

---

### Task 10: Org Context Provider

**Files:**
- Create: `src/components/providers.tsx`
- Create: `src/lib/queries/organizations.ts`

- [ ] **Step 1: Create org queries**

Create `src/lib/queries/organizations.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function getUserOrganizations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(id, name, invite_code)")
    .eq("user_id", user.id);

  return (data ?? []).map((m: any) => ({
    id: m.organizations.id,
    name: m.organizations.name,
    invite_code: m.organizations.invite_code,
    role: m.role,
  }));
}

export async function getActiveSeason(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .single();

  return data;
}

export async function getOrgGenres(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("genres")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order");

  return data ?? [];
}
```

- [ ] **Step 2: Create providers component**

Create `src/components/providers.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface OrgContextValue {
  currentOrgId: string | null;
  currentOrgName: string | null;
  currentRole: string | null;
  setCurrentOrg: (orgId: string) => void;
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>;
  seasonId: string | null;
  genres: Array<{ id: string; name: string }>;
}

const OrgContext = createContext<OrgContextValue>({
  currentOrgId: null,
  currentOrgName: null,
  currentRole: null,
  setCurrentOrg: () => {},
  orgs: [],
  seasonId: null,
  genres: [],
});

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({
  children,
  orgs,
  initialOrgId,
  seasonId,
  genres,
}: {
  children: ReactNode;
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>;
  initialOrgId: string | null;
  seasonId: string | null;
  genres: Array<{ id: string; name: string }>;
}) {
  const [currentOrgId, setCurrentOrgId] = useState(
    initialOrgId ?? orgs[0]?.id ?? null
  );

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;

  function setCurrentOrg(orgId: string) {
    setCurrentOrgId(orgId);
    // Persist selection in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("currentOrgId", orgId);
    }
  }

  return (
    <OrgContext.Provider
      value={{
        currentOrgId,
        currentOrgName: currentOrg?.name ?? null,
        currentRole: currentOrg?.role ?? null,
        setCurrentOrg,
        orgs,
        seasonId,
        genres,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/providers.tsx src/lib/queries/organizations.ts
git commit -m "feat: add org context provider and organization queries"
```

---

### Task 11: Root Landing Page Redirect

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update root page to redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/leaderboard");
  } else {
    redirect("/login");
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add root page redirect based on auth state"
```

---

## Chunk 3: Scoring Engine & Book Lookup

### Task 12: Scoring Type Definitions

**Files:**
- Create: `src/lib/scoring-types.ts`

- [ ] **Step 1: Create scoring type definitions and constants**

Create `src/lib/scoring-types.ts`:

```ts
import type { BonusKey, DeductionKey, HometownBonusKey, ScoringRulesConfig } from "@/types/database";

export const BONUS_LABELS: Record<BonusKey, string> = {
  classics_1900: "Classics (1900-Present)",
  classics_1750: "1750-1900",
  classics_pre1750: "Before 1750",
  series: "Series",
  translation: "Translation",
  birth_year: "Birth Year",
  current_year: "Current Year",
  holiday_event: "Relatable Holiday/Event",
  award_winner: "Award Winner",
  new_country: "New (Unique) Country",
};

export const DEDUCTION_LABELS: Record<DeductionKey, string> = {
  graphic_novel: "Graphic Novel",
  comics_manga: "Comics / Manga",
  audiobook: "Audiobook",
  reread: "Re-read",
  audiobook_reread: "Audiobook Re-read",
};

export const HOMETOWN_BONUS_LABELS: Record<HometownBonusKey, string> = {
  state_setting: "Set in Florida / My State",
  state_name: '"Florida" / "Hometown State" in title',
  city_name: '"Tampa" / "Hometown City" in title',
};

export interface ScoreInput {
  pages: number;
  fiction: boolean;
  bonus_1: BonusKey | null;
  bonus_2: BonusKey | null;
  bonus_3: BonusKey | null;
  hometown_bonus: HometownBonusKey | null;
  deduction: DeductionKey | null;
}

export interface SeasonBonusResult {
  genreCompleteBonus: number;
  alphabetBonus: number;
  uniqueLetters: number;
  coveredGenres: string[];
  totalSeasonBonus: number;
}

export interface ScoreBreakdown {
  basePoints: number;
  pagePoints: number;
  preBonusTotal: number;
  bonusAmounts: { key: string; label: string; amount: number }[];
  hometownBonusAmount: number;
  postBonusTotal: number;
  deductionMultiplier: number;
  deductionLabel: string | null;
  finalScore: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scoring-types.ts
git commit -m "feat: add scoring type definitions and label constants"
```

---

### Task 13: Scoring Engine — calculateBookScore

**Files:**
- Create: `src/lib/scoring.ts`
- Create: `src/lib/__tests__/scoring.test.ts`

- [ ] **Step 1: Write failing tests for calculateBookScore**

Create `src/lib/__tests__/scoring.test.ts`:

```ts
import { calculateBookScore } from "../scoring";
import type { ScoringRulesConfig } from "@/types/database";
import type { ScoreInput } from "../scoring-types";

const DEFAULT_CONFIG: ScoringRulesConfig = {
  base_points: { fiction: 0.71, nonfiction: 1.26 },
  page_points: { first_100_rate: 0.0028, beyond_100_rate: 0.01 },
  bonuses: {
    classics_1900: 0.072,
    classics_1750: 0.143,
    classics_pre1750: 0.286,
    series: 0.143,
    translation: 0.057,
    birth_year: 0.029,
    current_year: 0.057,
    holiday_event: 0.029,
    award_winner: 0.057,
    new_country: 0.057,
  },
  hometown_bonuses: {
    state_setting: 0.029,
    state_name: 0.0029,
    city_name: 0.0058,
  },
  deductions: {
    graphic_novel: 0.3,
    comics_manga: 0.2,
    audiobook: 0.75,
    reread: 0.5,
    audiobook_reread: 0.25,
  },
  season_bonuses: {
    genre_complete_pct: 0.10,
    alphabet_13_pct: 0.06,
    alphabet_26_pct: 0.14,
  },
  longest_road: {
    countries: [10, 7, 4],
    series: [8, 5, 3],
  },
};

describe("calculateBookScore", () => {
  it("calculates base score for fiction with no bonuses", () => {
    const input: ScoreInput = {
      pages: 300,
      fiction: true,
      bonus_1: null,
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: null,
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71
    // Pages: min(300,100)*0.0028 + max(300-100,0)*0.01 = 0.28 + 2.0 = 2.28
    // Total: 0.71 + 2.28 = 2.99
    expect(result.finalScore).toBeCloseTo(2.99, 2);
    expect(result.basePoints).toBeCloseTo(0.71, 2);
    expect(result.pagePoints).toBeCloseTo(2.28, 2);
  });

  it("calculates base score for nonfiction", () => {
    const input: ScoreInput = {
      pages: 50,
      fiction: false,
      bonus_1: null,
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: null,
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 1.26, Pages: 50*0.0028 = 0.14, Total: 1.40
    expect(result.finalScore).toBeCloseTo(1.40, 2);
  });

  it("applies bonus multipliers correctly", () => {
    const input: ScoreInput = {
      pages: 200,
      fiction: true,
      bonus_1: "series",
      bonus_2: "award_winner",
      bonus_3: null,
      hometown_bonus: "state_setting",
      deduction: null,
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71, Pages: 0.28 + 1.0 = 1.28, PreBonus: 1.99
    // Series: 1.99 * 0.143 = 0.28457
    // Award: 1.99 * 0.057 = 0.11343
    // Hometown: 1.99 * 0.029 = 0.05771
    // Total: 1.99 + 0.28457 + 0.11343 + 0.05771 = 2.44571
    expect(result.finalScore).toBeCloseTo(2.4457, 2);
    expect(result.bonusAmounts.length).toBe(2);
  });

  it("applies deduction multiplier", () => {
    const input: ScoreInput = {
      pages: 100,
      fiction: true,
      bonus_1: null,
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: "audiobook",
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71, Pages: 0.28, PreBonus: 0.99
    // Deduction: 0.99 * 0.75 = 0.7425
    expect(result.finalScore).toBeCloseTo(0.7425, 2);
    expect(result.deductionMultiplier).toBe(0.75);
  });

  it("applies bonuses then deduction", () => {
    const input: ScoreInput = {
      pages: 400,
      fiction: true,
      bonus_1: "classics_pre1750",
      bonus_2: null,
      bonus_3: null,
      hometown_bonus: null,
      deduction: "reread",
    };
    const result = calculateBookScore(input, DEFAULT_CONFIG);
    // Base: 0.71, Pages: 0.28 + 3.0 = 3.28, PreBonus: 3.99
    // Classics bonus: 3.99 * 0.286 = 1.14114
    // PostBonus: 3.99 + 1.14114 = 5.13114
    // Deduction: 5.13114 * 0.5 = 2.56557
    expect(result.finalScore).toBeCloseTo(2.5656, 2);
  });
});
```

- [ ] **Step 2: Install test dependencies and run tests to verify they fail**

```bash
npm install -D jest @types/jest ts-jest
npx ts-jest config:init
```

Update `jest.config.js` to handle path aliases:

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

```bash
npx jest src/lib/__tests__/scoring.test.ts
```

Expected: FAIL — `Cannot find module '../scoring'`

- [ ] **Step 3: Implement calculateBookScore**

Create `src/lib/scoring.ts`:

```ts
import type { ScoringRulesConfig, BonusKey, DeductionKey, HometownBonusKey } from "@/types/database";
import type { ScoreInput, ScoreBreakdown, SeasonBonusResult } from "./scoring-types";
import { BONUS_LABELS, DEDUCTION_LABELS, HOMETOWN_BONUS_LABELS } from "./scoring-types";

export function calculateBookScore(
  input: ScoreInput,
  config: ScoringRulesConfig
): ScoreBreakdown {
  // 1. Base points
  const basePoints = input.fiction
    ? config.base_points.fiction
    : config.base_points.nonfiction;

  // 2. Page points
  const firstPages = Math.min(input.pages, 100) * config.page_points.first_100_rate;
  const extraPages = Math.max(input.pages - 100, 0) * config.page_points.beyond_100_rate;
  const pagePoints = firstPages + extraPages;

  // 3. Pre-bonus total
  const preBonusTotal = basePoints + pagePoints;

  // 4. Bonus multipliers
  const bonusKeys = [input.bonus_1, input.bonus_2, input.bonus_3].filter(
    (k): k is BonusKey => k !== null
  );

  const bonusAmounts = bonusKeys.map((key) => ({
    key,
    label: BONUS_LABELS[key],
    amount: preBonusTotal * config.bonuses[key],
  }));

  // Hometown bonus
  let hometownBonusAmount = 0;
  if (input.hometown_bonus) {
    hometownBonusAmount =
      preBonusTotal * config.hometown_bonuses[input.hometown_bonus];
  }

  const totalBonuses =
    bonusAmounts.reduce((sum, b) => sum + b.amount, 0) + hometownBonusAmount;
  const postBonusTotal = preBonusTotal + totalBonuses;

  // 5. Deduction multiplier
  let deductionMultiplier = 1;
  let deductionLabel: string | null = null;
  if (input.deduction) {
    deductionMultiplier = config.deductions[input.deduction];
    deductionLabel = DEDUCTION_LABELS[input.deduction];
  }

  const finalScore = postBonusTotal * deductionMultiplier;

  return {
    basePoints,
    pagePoints,
    preBonusTotal,
    bonusAmounts,
    hometownBonusAmount,
    postBonusTotal,
    deductionMultiplier,
    deductionLabel,
    finalScore,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/__tests__/scoring.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/__tests__/ jest.config.js
git commit -m "feat: implement calculateBookScore with tests"
```

---

### Task 14: Scoring Engine — Season Bonuses

**Files:**
- Modify: `src/lib/scoring.ts`
- Modify: `src/lib/__tests__/scoring.test.ts`

- [ ] **Step 1: Write failing tests for season bonus calculations**

Append to `src/lib/__tests__/scoring.test.ts`:

```ts
import { calculateSeasonBonuses } from "../scoring";
import type { BookEntry } from "@/types/database";

// Helper to create minimal entries for season bonus testing
function makeSeasonEntry(overrides: {
  genre_id?: string | null;
  book_title?: string;
  preBonusTotal?: number;
}) {
  return {
    preBonusTotal: overrides.preBonusTotal ?? 2.0,
    genre_id: overrides.genre_id ?? null,
    book: { title: overrides.book_title ?? "Test Book" },
  };
}

describe("calculateSeasonBonuses", () => {
  it("returns genre complete bonus when all genres covered", () => {
    const genres = ["g1", "g2", "g3"];
    const entries = genres.map((gid) =>
      makeSeasonEntry({ genre_id: gid, preBonusTotal: 2 })
    );
    const result = calculateSeasonBonuses(entries, genres, DEFAULT_CONFIG);
    // Sum of preBonusTotal = 6, genre complete = 6 * 0.10 = 0.6
    expect(result.genreCompleteBonus).toBeCloseTo(0.6, 2);
  });

  it("returns zero genre bonus when incomplete", () => {
    const genres = ["g1", "g2", "g3"];
    const entries = [makeSeasonEntry({ genre_id: "g1", preBonusTotal: 2 })];
    const result = calculateSeasonBonuses(entries, genres, DEFAULT_CONFIG);
    expect(result.genreCompleteBonus).toBe(0);
  });

  it("calculates alphabet challenge 13+ letters", () => {
    const entries = "ABCDEFGHIJKLM".split("").map((letter) =>
      makeSeasonEntry({ book_title: `${letter} Story`, preBonusTotal: 1 })
    );
    const result = calculateSeasonBonuses(entries, [], DEFAULT_CONFIG);
    // 13 entries, each preBonusTotal=1, total=13. 13 letters = +6%: 13 * 0.06 = 0.78
    expect(result.alphabetBonus).toBeCloseTo(0.78, 2);
  });

  it("calculates alphabet challenge all 26 letters", () => {
    const entries = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) =>
      makeSeasonEntry({ book_title: `${letter} Story`, preBonusTotal: 1 })
    );
    const result = calculateSeasonBonuses(entries, [], DEFAULT_CONFIG);
    // 26 entries, each preBonusTotal=1, total=26. 26 letters = +14%: 26 * 0.14 = 3.64
    expect(result.alphabetBonus).toBeCloseTo(3.64, 2);
  });

  it("strips leading articles for alphabet challenge", () => {
    const entries = [
      makeSeasonEntry({ book_title: "The Amazing Race", preBonusTotal: 1 }),
      makeSeasonEntry({ book_title: "A Bright Day", preBonusTotal: 1 }),
      makeSeasonEntry({ book_title: "An Elephant", preBonusTotal: 1 }),
    ];
    const result = calculateSeasonBonuses(entries, [], DEFAULT_CONFIG);
    // "The Amazing" -> A, "A Bright" -> B, "An Elephant" -> E = 3 letters
    expect(result.uniqueLetters).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/lib/__tests__/scoring.test.ts
```

Expected: FAIL — `calculateSeasonBonuses is not exported`

- [ ] **Step 3: Implement calculateSeasonBonuses**

Append to `src/lib/scoring.ts`:

```ts
function getFirstLetter(title: string): string {
  const stripped = title
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
  return stripped.charAt(0).toUpperCase();
}

/**
 * Season-level bonuses are a % of the player's sum of PRE-BONUS points
 * (per spec: "% of player's sum of pre-bonus points").
 * Each entry must provide preBonusTotal (base + page points, before
 * bonus multipliers and deductions).
 */
export function calculateSeasonBonuses(
  entries: Array<{ preBonusTotal: number; genre_id: string | null; book: { title: string } }>,
  orgGenreIds: string[],
  config: ScoringRulesConfig
): SeasonBonusResult {
  const totalPreBonus = entries.reduce((sum, e) => sum + e.preBonusTotal, 0);

  // Genre challenge
  const coveredGenres = [...new Set(
    entries.map((e) => e.genre_id).filter((g): g is string => g !== null)
  )];
  const allGenresCovered =
    orgGenreIds.length > 0 &&
    orgGenreIds.every((gid) => coveredGenres.includes(gid));
  const genreCompleteBonus = allGenresCovered
    ? totalPreBonus * config.season_bonuses.genre_complete_pct
    : 0;

  // Alphabet challenge
  const letters = new Set(
    entries.map((e) => getFirstLetter(e.book.title))
  );
  const uniqueLetters = letters.size;
  let alphabetBonus = 0;
  if (uniqueLetters >= 26) {
    alphabetBonus = totalPreBonus * config.season_bonuses.alphabet_26_pct;
  } else if (uniqueLetters >= 13) {
    alphabetBonus = totalPreBonus * config.season_bonuses.alphabet_13_pct;
  }

  const totalSeasonBonus = genreCompleteBonus + alphabetBonus;

  return {
    genreCompleteBonus,
    alphabetBonus,
    uniqueLetters,
    coveredGenres,
    totalSeasonBonus,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/__tests__/scoring.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/__tests__/scoring.test.ts
git commit -m "feat: implement calculateSeasonBonuses with genre and alphabet challenges"
```

---

### Task 15: Open Library API Integration

**Files:**
- Create: `src/lib/books-api.ts`
- Create: `src/lib/__tests__/books-api.test.ts`

- [ ] **Step 1: Write test for Open Library search**

Create `src/lib/__tests__/books-api.test.ts`:

```ts
import { searchBooks, parseOpenLibraryResult } from "../books-api";

describe("parseOpenLibraryResult", () => {
  it("parses a complete Open Library doc", () => {
    const doc = {
      title: "Dune",
      author_name: ["Frank Herbert"],
      isbn: ["9780441172719"],
      number_of_pages_median: 412,
      first_publish_year: 1965,
      cover_i: 8230789,
    };
    const result = parseOpenLibraryResult(doc);
    expect(result.title).toBe("Dune");
    expect(result.author).toBe("Frank Herbert");
    expect(result.isbn).toBe("9780441172719");
    expect(result.pages).toBe(412);
    expect(result.year_published).toBe(1965);
    expect(result.cover_url).toContain("8230789");
  });

  it("handles missing fields gracefully", () => {
    const doc = {
      title: "Unknown Book",
      author_name: undefined,
      isbn: undefined,
      number_of_pages_median: undefined,
      first_publish_year: undefined,
      cover_i: undefined,
    };
    const result = parseOpenLibraryResult(doc);
    expect(result.title).toBe("Unknown Book");
    expect(result.author).toBe("Unknown");
    expect(result.isbn).toBeNull();
    expect(result.pages).toBe(0);
    expect(result.cover_url).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/__tests__/books-api.test.ts
```

Expected: FAIL — `Cannot find module '../books-api'`

- [ ] **Step 3: Implement Open Library API client**

Create `src/lib/books-api.ts`:

```ts
export interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  isbn?: string[];
  number_of_pages_median?: number;
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
}

export interface ParsedBook {
  title: string;
  author: string;
  isbn: string | null;
  pages: number;
  year_published: number | null;
  cover_url: string | null;
  country: string | null; // Not reliably available from Open Library; user fills manually
}

export function parseOpenLibraryResult(doc: OpenLibraryDoc): ParsedBook {
  return {
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown",
    isbn: doc.isbn?.[0] ?? null,
    pages: doc.number_of_pages_median ?? 0,
    year_published: doc.first_publish_year ?? null,
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    country: null, // User fills manually
  };
}

export async function searchBooks(query: string): Promise<ParsedBook[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://openlibrary.org/search.json?q=${encoded}&limit=10&fields=title,author_name,isbn,number_of_pages_median,first_publish_year,cover_i`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Library API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.docs ?? []).map(parseOpenLibraryResult);
}

export async function searchByISBN(isbn: string): Promise<ParsedBook | null> {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=title,author_name,isbn,number_of_pages_median,first_publish_year,cover_i`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.docs?.length) return null;

  return parseOpenLibraryResult(data.docs[0]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/__tests__/books-api.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/books-api.ts src/lib/__tests__/books-api.test.ts
git commit -m "feat: implement Open Library API integration with search and ISBN lookup"
```

---

### Task 16: Book Entry Server Actions

**Files:**
- Create: `src/lib/actions/books.ts`
- Create: `src/lib/queries/books.ts`

- [ ] **Step 1: Create book queries**

Create `src/lib/queries/books.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function getUserBookEntries(seasonId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_entries")
    .select("*, book:books(*)")
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSeasonEntries(seasonId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_entries")
    .select("*, book:books(*), profile:profiles(display_name)")
    .eq("season_id", seasonId);

  if (error) throw error;
  return data ?? [];
}

export async function getBookEntry(entryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("book_entries")
    .select("*, book:books(*)")
    .eq("id", entryId)
    .single();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Create book server actions**

Create `src/lib/actions/books.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calculateBookScore } from "@/lib/scoring";
import type { ScoringRulesConfig, BonusKey, DeductionKey, HometownBonusKey } from "@/types/database";

async function getScoringConfig(orgId: string): Promise<ScoringRulesConfig> {
  const supabase = await createClient();

  // Try org-specific first, then fall back to global
  const { data: orgRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .eq("org_id", orgId)
    .single();

  if (orgRules) return orgRules.config as ScoringRulesConfig;

  const { data: globalRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .is("org_id", null)
    .single();

  if (!globalRules) throw new Error("No scoring rules found");
  return globalRules.config as ScoringRulesConfig;
}

export async function findOrCreateBook(bookData: {
  isbn: string | null;
  title: string;
  author: string;
  pages: number;
  year_published: number | null;
  country: string | null;
  cover_url: string | null;
}) {
  const supabase = await createClient();

  // Check if book with this ISBN already exists
  if (bookData.isbn) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("isbn", bookData.isbn)
      .single();

    if (existing) return existing.id;
  }

  // Create new book
  const { data, error } = await supabase
    .from("books")
    .insert(bookData)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function createBookEntry(input: {
  seasonId: string;
  orgId: string;
  bookId: string;
  completed: boolean;
  fiction: boolean;
  seriesName: string | null;
  genreId: string | null;
  dateFinished: string | null;
  rating: number | null;
  hometownBonus: HometownBonusKey | null;
  bonus1: BonusKey | null;
  bonus2: BonusKey | null;
  bonus3: BonusKey | null;
  deduction: DeductionKey | null;
  pages: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Calculate score
  const config = await getScoringConfig(input.orgId);
  const score = calculateBookScore(
    {
      pages: input.pages,
      fiction: input.fiction,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      hometown_bonus: input.hometownBonus,
      deduction: input.deduction,
    },
    config
  );

  const { data, error } = await supabase
    .from("book_entries")
    .insert({
      season_id: input.seasonId,
      user_id: user.id,
      book_id: input.bookId,
      completed: input.completed,
      fiction: input.fiction,
      series_name: input.seriesName,
      genre_id: input.genreId,
      date_finished: input.dateFinished,
      rating: input.rating,
      hometown_bonus: input.hometownBonus,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      deduction: input.deduction,
      points: score.finalScore,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Check for flagged entry conditions
  await checkAndFlagEntry(data.id, input.seasonId, score.finalScore);

  revalidatePath("/", "layout");
  return data.id;
}

async function checkAndFlagEntry(
  entryId: string,
  seasonId: string,
  points: number
) {
  const supabase = await createClient();

  // Check high_points: 2 standard deviations above the mean
  const { data: allEntries } = await supabase
    .from("book_entries")
    .select("points")
    .eq("season_id", seasonId);

  if (allEntries && allEntries.length >= 3) {
    const pointValues = allEntries.map((e) => Number(e.points));
    const mean = pointValues.reduce((a, b) => a + b, 0) / pointValues.length;
    const stdDev = Math.sqrt(
      pointValues.reduce((sum, p) => sum + (p - mean) ** 2, 0) /
        pointValues.length
    );

    if (points > mean + 2 * stdDev) {
      await supabase.from("flagged_entries").insert({
        book_entry_id: entryId,
        reason: "high_points",
      });
    }
  }

  // Check duplicate_book: same book by same user in same season
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entry } = await supabase
    .from("book_entries")
    .select("book_id")
    .eq("id", entryId)
    .single();

  if (entry && user) {
    const { data: duplicates } = await supabase
      .from("book_entries")
      .select("id")
      .eq("season_id", seasonId)
      .eq("user_id", user.id)
      .eq("book_id", entry.book_id)
      .neq("id", entryId);

    if (duplicates && duplicates.length > 0) {
      await supabase.from("flagged_entries").insert({
        book_entry_id: entryId,
        reason: "duplicate_book",
      });
    }
  }
}

export async function updateBookEntry(
  entryId: string,
  orgId: string,
  input: {
    completed: boolean;
    fiction: boolean;
    seriesName: string | null;
    genreId: string | null;
    dateFinished: string | null;
    rating: number | null;
    hometownBonus: HometownBonusKey | null;
    bonus1: BonusKey | null;
    bonus2: BonusKey | null;
    bonus3: BonusKey | null;
    deduction: DeductionKey | null;
    pages: number;
  }
) {
  const supabase = await createClient();

  const config = await getScoringConfig(orgId);
  const score = calculateBookScore(
    {
      pages: input.pages,
      fiction: input.fiction,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      hometown_bonus: input.hometownBonus,
      deduction: input.deduction,
    },
    config
  );

  const { error } = await supabase
    .from("book_entries")
    .update({
      completed: input.completed,
      fiction: input.fiction,
      series_name: input.seriesName,
      genre_id: input.genreId,
      date_finished: input.dateFinished,
      rating: input.rating,
      hometown_bonus: input.hometownBonus,
      bonus_1: input.bonus1,
      bonus_2: input.bonus2,
      bonus_3: input.bonus3,
      deduction: input.deduction,
      points: score.finalScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) throw error;

  revalidatePath("/", "layout");
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors. These server actions depend on a running Supabase instance for integration testing, which will be validated end-to-end when the UI is wired up in Chunk 4. The scoring calculation is covered by unit tests in Task 13.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/books.ts src/lib/queries/books.ts
git commit -m "feat: add book entry server actions with scoring and flagging"
```

---

### Task 17: Leaderboard Query

**Files:**
- Create: `src/lib/queries/leaderboard.ts`

- [ ] **Step 1: Create leaderboard data fetching**

Create `src/lib/queries/leaderboard.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { calculateSeasonBonuses } from "@/lib/scoring";
import type { ScoringRulesConfig, LeaderboardPlayer } from "@/types/database";

export async function getLeaderboardData(
  seasonId: string,
  orgId: string
): Promise<LeaderboardPlayer[]> {
  const supabase = await createClient();

  // Get all entries for this season with book and profile data
  const { data: entries, error } = await supabase
    .from("book_entries")
    .select("*, book:books(title, pages), profile:profiles(display_name)")
    .eq("season_id", seasonId);

  if (error) throw error;
  if (!entries?.length) return [];

  // Get scoring config
  const { data: scoringRules } = await supabase
    .from("scoring_rules")
    .select("config")
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .order("org_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const config = scoringRules?.config as ScoringRulesConfig;

  // Get org genres for genre challenge
  const { data: genres } = await supabase
    .from("genres")
    .select("id")
    .eq("org_id", orgId);

  const genreIds = (genres ?? []).map((g) => g.id);

  // Group entries by user
  const byUser = new Map<
    string,
    {
      display_name: string;
      entries: typeof entries;
    }
  >();

  for (const entry of entries) {
    const userId = entry.user_id;
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        display_name: (entry as any).profile?.display_name ?? "Unknown",
        entries: [],
      });
    }
    byUser.get(userId)!.entries.push(entry);
  }

  // Calculate per-player totals with season bonuses
  const players: LeaderboardPlayer[] = [];

  for (const [userId, data] of byUser) {
    const bookPoints = data.entries.reduce(
      (sum, e) => sum + Number(e.points),
      0
    );
    const pageCount = data.entries.reduce(
      (sum, e) => sum + ((e as any).book?.pages ?? 0),
      0
    );

    // Calculate season bonuses using pre-bonus totals (re-derived from scoring engine)
    let seasonBonus = 0;
    if (config) {
      const enriched = data.entries.map((e) => {
        // Re-derive preBonusTotal from the entry's stored data
        const pages = (e as any).book?.pages ?? 0;
        const fiction = e.fiction;
        const base = fiction ? config.base_points.fiction : config.base_points.nonfiction;
        const pagePoints = Math.min(pages, 100) * config.page_points.first_100_rate
          + Math.max(pages - 100, 0) * config.page_points.beyond_100_rate;
        return {
          preBonusTotal: base + pagePoints,
          genre_id: e.genre_id,
          book: { title: (e as any).book?.title ?? "" },
        };
      });
      const bonuses = calculateSeasonBonuses(enriched, genreIds, config);
      seasonBonus = bonuses.totalSeasonBonus;
    }

    players.push({
      user_id: userId,
      display_name: data.display_name,
      total_points: bookPoints + seasonBonus,
      book_count: data.entries.length,
      page_count: pageCount,
      rank: 0,
    });
  }

  // Sort by total points descending, assign ranks
  players.sort((a, b) => b.total_points - a.total_points);
  players.forEach((p, i) => (p.rank = i + 1));

  // DEFERRED: "Longest Road" bonuses (most unique countries: 10/7/4 pts,
  // longest series: 8/5/3 pts) are defined in the spec and config but
  // implementation is deferred to a future chunk. They require cross-player
  // comparison (top 3 across all players) which adds complexity. The config
  // values are already seeded and ready.

  return players;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors. The leaderboard query depends on a populated database — full verification will happen when the leaderboard UI renders in Chunk 4.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/leaderboard.ts
git commit -m "feat: add leaderboard query with season bonus calculations"
```

---

## Chunk 4: App Shell & Core Screens

### Task 18: Navigation Components

**Files:**
- Create: `src/components/nav-sidebar.tsx`
- Create: `src/components/nav-bottom-tabs.tsx`
- Create: `src/components/org-switcher.tsx`

- [ ] **Step 1: Create sidebar navigation**

Create `src/components/nav-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BookOpen, BarChart3, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSwitcher } from "./org-switcher";
import { useOrg } from "./providers";

const navItems = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/my-books", label: "My Books", icon: BookOpen },
  { href: "/progress", label: "My Progress", icon: BarChart3 },
];

const adminItems = [
  { href: "/admin/settings", label: "Admin Settings", icon: Settings },
];

export function NavSidebar({ onAddBook }: { onAddBook: () => void }) {
  const pathname = usePathname();
  const { currentRole } = useOrg();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-bold">📚 Super Reader</span>
      </div>
      <div className="px-3 py-2">
        <OrgSwitcher />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        {currentRole === "admin" &&
          adminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
      </nav>
      <div className="border-t p-3">
        <button
          onClick={onAddBook}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Book
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create bottom tab navigation**

Create `src/components/nav-bottom-tabs.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BookOpen, BarChart3, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "./providers";

export function NavBottomTabs({ onAddBook }: { onAddBook: () => void }) {
  const pathname = usePathname();
  const { currentRole } = useOrg();

  const tabs = [
    { href: "/leaderboard", label: "Board", icon: Trophy },
    { href: "/my-books", label: "Books", icon: BookOpen },
    { label: "Add", icon: Plus, isAction: true },
    { href: "/progress", label: "Progress", icon: BarChart3 },
    ...(currentRole === "admin"
      ? [{ href: "/admin/settings", label: "Admin", icon: Settings }]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:hidden">
      <div className="flex items-center justify-around py-1">
        {tabs.map((tab) =>
          tab.isAction ? (
            <button
              key="add"
              onClick={onAddBook}
              className="flex flex-col items-center gap-0.5 px-3 py-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Plus className="h-5 w-5" />
              </div>
            </button>
          ) : (
            <Link
              key={tab.href}
              href={tab.href!}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs",
                pathname === tab.href || pathname.startsWith(tab.href! + "/")
                  ? "text-indigo-600"
                  : "text-gray-500"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create org switcher**

Create `src/components/org-switcher.tsx`:

```tsx
"use client";

import { useOrg } from "./providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrgSwitcher() {
  const { orgs, currentOrgId, setCurrentOrg } = useOrg();

  if (orgs.length <= 1) return null;

  return (
    <Select value={currentOrgId ?? undefined} onValueChange={setCurrentOrg}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select competition" />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/nav-sidebar.tsx src/components/nav-bottom-tabs.tsx src/components/org-switcher.tsx
git commit -m "feat: add navigation sidebar, bottom tabs, and org switcher"
```

---

### Task 19: App Shell Layout

**Files:**
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create the authenticated app layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizations } from "@/lib/queries/organizations";
import { OrgProvider } from "@/components/providers";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgs = await getUserOrganizations();

  // If user has no orgs, redirect to a "join or create" flow
  if (orgs.length === 0) {
    redirect("/signup"); // Will add a proper "no org" page later
  }

  // Read saved org preference from cookie/default to first
  const initialOrgId = orgs[0]?.id ?? null;

  return (
    <OrgProvider orgs={orgs} initialOrgId={initialOrgId}>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
```

- [ ] **Step 2: Create AppShell client component**

Create `src/app/(app)/app-shell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { NavSidebar } from "@/components/nav-sidebar";
import { NavBottomTabs } from "@/components/nav-bottom-tabs";
import { AddBookPanel } from "@/components/add-book-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addBookOpen, setAddBookOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavSidebar onAddBook={() => setAddBookOpen(true)} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <NavBottomTabs onAddBook={() => setAddBookOpen(true)} />
      <AddBookPanel open={addBookOpen} onClose={() => setAddBookOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder AddBookPanel**

Create `src/components/add-book-panel.tsx` (placeholder — full implementation in Chunk 5):

```tsx
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function AddBookPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add a Book</SheetTitle>
        </SheetHeader>
        <div className="py-6 text-center text-muted-foreground">
          Book entry form coming soon...
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Verify app shell renders**

```bash
npm run dev
```

Navigate to `localhost:3000/leaderboard` (after logging in). Expected: sidebar on desktop, bottom tabs on mobile, "Add Book" button opens a slide-over panel.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/ src/components/add-book-panel.tsx
git commit -m "feat: add app shell layout with sidebar, bottom tabs, and add book panel placeholder"
```

---

### Task 20: Leaderboard Page

**Files:**
- Create: `src/app/(app)/leaderboard/page.tsx`
- Create: `src/components/leaderboard-podium.tsx`
- Create: `src/components/leaderboard-table.tsx`

- [ ] **Step 1: Create leaderboard podium component**

Create `src/components/leaderboard-podium.tsx`:

```tsx
import type { LeaderboardPlayer } from "@/types/database";

const medals = ["🏆", "🥈", "🥉"];
const cardStyles = [
  "border-2 border-indigo-500 shadow-lg shadow-indigo-500/15", // 1st
  "shadow-md", // 2nd
  "shadow-md", // 3rd
];

export function LeaderboardPodium({ players }: { players: LeaderboardPlayer[] }) {
  const top3 = players.slice(0, 3);
  if (top3.length === 0) return null;

  // Display order: 2nd, 1st, 3rd
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="flex justify-center gap-4 mb-6">
      {ordered.map((player, i) => {
        const actualRank = player.rank - 1; // 0-indexed for medal lookup
        const isFirst = player.rank === 1;
        return (
          <div
            key={player.user_id}
            className={`text-center bg-white rounded-2xl p-6 ${cardStyles[actualRank]} ${
              isFirst ? "w-48 -mb-3" : "w-44"
            }`}
          >
            <div className={`${isFirst ? "text-5xl" : "text-4xl"} mb-1`}>
              {medals[actualRank]}
            </div>
            <div className={`font-bold ${isFirst ? "text-xl" : "text-lg"} mt-1 text-gray-900`}>
              {player.display_name}
            </div>
            <div className={`text-indigo-600 font-extrabold ${isFirst ? "text-3xl" : "text-2xl"} mt-1`}>
              {player.total_points.toFixed(1)}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              {player.book_count} {player.book_count === 1 ? "book" : "books"} · {player.page_count.toLocaleString()} pages
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create leaderboard table component**

Create `src/components/leaderboard-table.tsx`:

```tsx
import type { LeaderboardPlayer } from "@/types/database";
import { cn } from "@/lib/utils";

const rankBgs: Record<number, string> = {
  1: "bg-yellow-50",
  2: "bg-indigo-50/50",
  3: "bg-orange-50/50",
};

const medals: Record<number, string> = {
  1: "🏆",
  2: "🥈",
  3: "🥉",
};

export function LeaderboardTable({
  players,
  currentUserId,
}: {
  players: LeaderboardPlayer[];
  currentUserId: string;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center px-5 py-3 bg-gray-50 border-b-2 border-gray-200">
        <span className="w-9 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</span>
        <span className="flex-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</span>
        <span className="w-16 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Books</span>
        <span className="w-20 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Pages</span>
        <span className="w-20 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Points</span>
      </div>
      {/* Rows */}
      {players.map((player) => {
        const isCurrentUser = player.user_id === currentUserId;
        const medal = medals[player.rank];
        return (
          <div
            key={player.user_id}
            className={cn(
              "flex items-center px-5 py-3.5 border-b border-gray-100 last:border-b-0",
              rankBgs[player.rank],
              isCurrentUser && "bg-indigo-50 border-l-[3px] border-l-indigo-500"
            )}
          >
            <span className={cn("w-9 font-bold text-base", isCurrentUser ? "text-indigo-600" : medal ? "" : "text-gray-400")}>
              {medal ?? player.rank}
            </span>
            <span className={cn("flex-1 font-semibold text-base", isCurrentUser ? "text-indigo-600" : "text-gray-900")}>
              {isCurrentUser ? `You (${player.display_name})` : player.display_name}
            </span>
            <span className={cn("w-16 text-center text-sm", isCurrentUser ? "text-indigo-600/70" : "text-gray-500")}>
              {player.book_count}
            </span>
            <span className={cn("w-20 text-center text-sm", isCurrentUser ? "text-indigo-600/70" : "text-gray-500")}>
              {player.page_count.toLocaleString()}
            </span>
            <span className={cn("w-20 text-right font-bold text-base", "text-indigo-600")}>
              {player.total_points.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create leaderboard page**

Create `src/app/(app)/leaderboard/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardData } from "@/lib/queries/leaderboard";
import { getActiveSeason } from "@/lib/queries/organizations";
import { getUserOrganizations } from "@/lib/queries/organizations";
import { LeaderboardPodium } from "@/components/leaderboard-podium";
import { LeaderboardTable } from "@/components/leaderboard-table";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0]; // Will use org context in future
  if (!currentOrg) return <div className="p-8 text-center">Join a competition to get started!</div>;

  const season = await getActiveSeason(currentOrg.id);
  if (!season) return <div className="p-8 text-center">No active season.</div>;

  const players = await getLeaderboardData(season.id, currentOrg.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-6">
        Leaderboard — {currentOrg.name} {season.name}
      </h1>
      <LeaderboardPodium players={players} />
      <LeaderboardTable players={players} currentUserId={user.id} />
    </div>
  );
}
```

- [ ] **Step 4: Verify leaderboard renders**

```bash
npm run dev
```

Navigate to `localhost:3000/leaderboard`. Expected: heading with org/season name. If no entries exist yet, podium and table will be empty but render without errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/leaderboard/ src/components/leaderboard-podium.tsx src/components/leaderboard-table.tsx
git commit -m "feat: add leaderboard page with podium and ranked table"
```

---

### Task 21: My Books Page

**Files:**
- Create: `src/app/(app)/my-books/page.tsx`
- Create: `src/components/book-entry-card.tsx`

- [ ] **Step 1: Create book entry card component**

Create `src/components/book-entry-card.tsx`:

```tsx
import type { BookEntryWithBook } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function BookEntryCard({
  entry,
  genreName,
  onClick,
}: {
  entry: BookEntryWithBook;
  genreName?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
    >
      {entry.book.cover_url && (
        <img
          src={entry.book.cover_url}
          alt={entry.book.title}
          className="w-12 h-16 object-cover rounded"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{entry.book.title}</h3>
        <p className="text-sm text-gray-500">{entry.book.author}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-gray-400">{entry.book.pages} pages</span>
          {genreName && <Badge variant="secondary" className="text-xs">{genreName}</Badge>}
          {entry.date_finished && (
            <span className="text-xs text-gray-400">
              {format(new Date(entry.date_finished), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-bold text-indigo-600">{Number(entry.points).toFixed(2)}</div>
        <div className="text-xs text-gray-400">pts</div>
        {entry.rating !== null && (
          <div className="text-xs text-gray-500 mt-1">{entry.rating}/10 ★</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create My Books page**

Create `src/app/(app)/my-books/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { getUserBookEntries } from "@/lib/queries/books";
import { getActiveSeason, getUserOrganizations, getOrgGenres } from "@/lib/queries/organizations";
import { BookEntryCard } from "@/components/book-entry-card";

export default async function MyBooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return <div className="p-8 text-center">Join a competition to get started!</div>;

  const season = await getActiveSeason(currentOrg.id);
  if (!season) return <div className="p-8 text-center">No active season.</div>;

  const entries = await getUserBookEntries(season.id, user.id);
  const genres = await getOrgGenres(currentOrg.id);
  const genreMap = new Map(genres.map((g) => [g.id, g.name]));

  const totalPoints = entries.reduce((sum, e: any) => sum + Number(e.points), 0);
  const totalPages = entries.reduce((sum, e: any) => sum + (e.book?.pages ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-lg font-bold text-gray-900">My Books</h1>
        <div className="text-sm text-gray-500">
          {entries.length} books · {totalPages.toLocaleString()} pages · {totalPoints.toFixed(1)} pts
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No books logged yet. Tap &ldquo;Add Book&rdquo; to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <BookEntryCard
              key={entry.id}
              entry={entry}
              genreName={entry.genre_id ? genreMap.get(entry.genre_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify My Books page renders**

```bash
npm run dev
```

Navigate to `localhost:3000/my-books`. Expected: header with "My Books" and stats. Empty state message if no entries.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/my-books/ src/components/book-entry-card.tsx
git commit -m "feat: add My Books page with book entry cards"
```

---

## Chunk 5: Add Book Panel

### Task 22: Book Search Component

**Files:**
- Create: `src/components/book-search.tsx`

- [ ] **Step 1: Create book search with Open Library integration**

Create `src/components/book-search.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import type { ParsedBook } from "@/lib/books-api";

export function BookSearch({
  onSelect,
}: {
  onSelect: (book: ParsedBook) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParsedBook[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,isbn,number_of_pages_median,first_publish_year,cover_i`
      );
      const data = await res.json();
      const parsed: ParsedBook[] = (data.docs ?? []).map((doc: any) => ({
        title: doc.title,
        author: doc.author_name?.[0] ?? "Unknown",
        isbn: doc.isbn?.[0] ?? null,
        pages: doc.number_of_pages_median ?? 0,
        year_published: doc.first_publish_year ?? null,
        cover_url: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
        country: null, // User fills manually
      }));
      setResults(parsed);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  function handleChange(value: string) {
    setQuery(value);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => search(value), 400));
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by title or ISBN..."
          className="pl-10"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {results.length > 0 && (
        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
          {results.map((book, i) => (
            <button
              key={`${book.isbn}-${i}`}
              onClick={() => {
                onSelect(book);
                setQuery(book.title);
                setResults([]);
              }}
              className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
            >
              {book.cover_url ? (
                <img src={book.cover_url} alt="" className="w-8 h-11 object-cover rounded" />
              ) : (
                <div className="w-8 h-11 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">📖</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{book.title}</div>
                <div className="text-xs text-gray-500">{book.author}</div>
                <div className="text-xs text-gray-400">{book.pages > 0 ? `${book.pages} pages` : "Pages unknown"} {book.year_published ? `· ${book.year_published}` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/book-search.tsx
git commit -m "feat: add book search component with Open Library integration"
```

---

### Task 23: Score Preview Component

**Files:**
- Create: `src/components/score-preview.tsx`

- [ ] **Step 1: Create live score preview card**

Create `src/components/score-preview.tsx`:

```tsx
"use client";

import type { ScoreBreakdown } from "@/lib/scoring-types";

export function ScorePreview({ breakdown }: { breakdown: ScoreBreakdown | null }) {
  if (!breakdown) {
    return (
      <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
        Select a book to see score preview
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-indigo-900">Estimated Score</span>
        <span className="text-2xl font-extrabold text-indigo-600">
          {breakdown.finalScore.toFixed(2)}
        </span>
      </div>
      <div className="space-y-1 text-xs text-indigo-800">
        <div className="flex justify-between">
          <span>Base ({breakdown.basePoints > 1 ? "Nonfiction" : "Fiction"})</span>
          <span>{breakdown.basePoints.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Page points</span>
          <span>+{breakdown.pagePoints.toFixed(3)}</span>
        </div>
        {breakdown.bonusAmounts.map((b) => (
          <div key={b.key} className="flex justify-between text-green-700">
            <span>{b.label}</span>
            <span>+{b.amount.toFixed(3)}</span>
          </div>
        ))}
        {breakdown.hometownBonusAmount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Hometown bonus</span>
            <span>+{breakdown.hometownBonusAmount.toFixed(3)}</span>
          </div>
        )}
        {breakdown.deductionLabel && (
          <div className="flex justify-between text-red-600">
            <span>{breakdown.deductionLabel}</span>
            <span>×{breakdown.deductionMultiplier}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/score-preview.tsx
git commit -m "feat: add live score preview card component"
```

---

### Task 24: Bonus & Deduction Chip Components

**Files:**
- Create: `src/components/bonus-chips.tsx`
- Create: `src/components/deduction-chips.tsx`

- [ ] **Step 1: Create bonus chips component**

Create `src/components/bonus-chips.tsx`:

```tsx
"use client";

import type { BonusKey } from "@/types/database";
import { BONUS_LABELS } from "@/lib/scoring-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ALL_BONUS_KEYS = Object.keys(BONUS_LABELS) as BonusKey[];

export function BonusChips({
  selected,
  onChange,
  maxSelections = 3,
}: {
  selected: (BonusKey | null)[];
  onChange: (bonuses: (BonusKey | null)[]) => void;
  maxSelections?: number;
}) {
  const activeKeys = selected.filter((k): k is BonusKey => k !== null);

  function toggle(key: BonusKey) {
    if (activeKeys.includes(key)) {
      onChange(selected.map((k) => (k === key ? null : k)));
    } else if (activeKeys.length < maxSelections) {
      // Fill first null slot
      const newSelected = [...selected];
      const emptyIdx = newSelected.findIndex((k) => k === null);
      if (emptyIdx !== -1) newSelected[emptyIdx] = key;
      onChange(newSelected);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Bonuses ({activeKeys.length}/{maxSelections})
      </label>
      <div className="flex flex-wrap gap-2">
        {ALL_BONUS_KEYS.map((key) => {
          const isActive = activeKeys.includes(key);
          return (
            <Badge
              key={key}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                isActive
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "hover:bg-green-50 text-gray-600"
              )}
              onClick={() => toggle(key)}
            >
              {BONUS_LABELS[key]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create deduction chips component**

Create `src/components/deduction-chips.tsx`:

```tsx
"use client";

import type { DeductionKey } from "@/types/database";
import { DEDUCTION_LABELS } from "@/lib/scoring-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ALL_DEDUCTION_KEYS = Object.keys(DEDUCTION_LABELS) as DeductionKey[];

export function DeductionChips({
  selected,
  onChange,
}: {
  selected: DeductionKey | null;
  onChange: (deduction: DeductionKey | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Deduction</label>
      <div className="flex flex-wrap gap-2">
        {ALL_DEDUCTION_KEYS.map((key) => {
          const isActive = selected === key;
          return (
            <Badge
              key={key}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                isActive
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "hover:bg-red-50 text-gray-600"
              )}
              onClick={() => onChange(isActive ? null : key)}
            >
              {DEDUCTION_LABELS[key]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/bonus-chips.tsx src/components/deduction-chips.tsx
git commit -m "feat: add bonus and deduction chip selector components"
```

---

### Task 25: Full Add Book Panel

**Files:**
- Modify: `src/components/add-book-panel.tsx`

- [ ] **Step 1: Implement the full add book panel**

Replace `src/components/add-book-panel.tsx` with the full implementation:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookSearch } from "./book-search";
import { ScorePreview } from "./score-preview";
import { BonusChips } from "./bonus-chips";
import { DeductionChips } from "./deduction-chips";
import { HOMETOWN_BONUS_LABELS } from "@/lib/scoring-types";
import { calculateBookScore } from "@/lib/scoring";
import { useOrg } from "./providers";
import { findOrCreateBook, createBookEntry } from "@/lib/actions/books";
import type { ParsedBook } from "@/lib/books-api";
import type { BonusKey, DeductionKey, HometownBonusKey, ScoringRulesConfig } from "@/types/database";

// Default config for client-side preview (matches seed data)
const DEFAULT_SCORING_CONFIG: ScoringRulesConfig = {
  base_points: { fiction: 0.71, nonfiction: 1.26 },
  page_points: { first_100_rate: 0.0028, beyond_100_rate: 0.01 },
  bonuses: {
    classics_1900: 0.072, classics_1750: 0.143, classics_pre1750: 0.286,
    series: 0.143, translation: 0.057, birth_year: 0.029,
    current_year: 0.057, holiday_event: 0.029, award_winner: 0.057,
    new_country: 0.057,
  },
  hometown_bonuses: { state_setting: 0.029, state_name: 0.0029, city_name: 0.0058 },
  deductions: {
    graphic_novel: 0.3, comics_manga: 0.2, audiobook: 0.75,
    reread: 0.5, audiobook_reread: 0.25,
  },
  season_bonuses: { genre_complete_pct: 0.10, alphabet_13_pct: 0.06, alphabet_26_pct: 0.14 },
  longest_road: { countries: [10, 7, 4], series: [8, 5, 3] },
};

interface AddBookPanelProps {
  open: boolean;
  onClose: () => void;
  genres?: Array<{ id: string; name: string }>;
  seasonId?: string;
  scoringConfig?: ScoringRulesConfig;
}

export function AddBookPanel({
  open,
  onClose,
  genres = [],
  seasonId,
  scoringConfig = DEFAULT_SCORING_CONFIG,
}: AddBookPanelProps) {
  const { currentOrgId } = useOrg();
  const [selectedBook, setSelectedBook] = useState<ParsedBook | null>(null);
  const [pages, setPages] = useState(0);
  const [fiction, setFiction] = useState(true);
  const [completed, setCompleted] = useState(true);
  const [seriesName, setSeriesName] = useState("");
  const [genreId, setGenreId] = useState<string>("");
  const [dateFinished, setDateFinished] = useState(new Date().toISOString().split("T")[0]);
  const [rating, setRating] = useState<string>("7");
  const [country, setCountry] = useState("");
  const [bonuses, setBonuses] = useState<(BonusKey | null)[]>([null, null, null]);
  const [hometownBonus, setHometownBonus] = useState<HometownBonusKey | null>(null);
  const [deduction, setDeduction] = useState<DeductionKey | null>(null);
  const [saving, setSaving] = useState(false);

  // Live score preview
  const scoreBreakdown = useMemo(() => {
    if (pages === 0 && !selectedBook) return null;
    return calculateBookScore(
      {
        pages: pages || selectedBook?.pages || 0,
        fiction,
        bonus_1: bonuses[0],
        bonus_2: bonuses[1],
        bonus_3: bonuses[2],
        hometown_bonus: hometownBonus,
        deduction,
      },
      scoringConfig
    );
  }, [pages, fiction, bonuses, hometownBonus, deduction, selectedBook, scoringConfig]);

  function handleBookSelect(book: ParsedBook) {
    setSelectedBook(book);
    setPages(book.pages);
    setCountry(book.country ?? "");
  }

  function resetForm() {
    setSelectedBook(null);
    setPages(0);
    setFiction(true);
    setCompleted(true);
    setSeriesName("");
    setGenreId("");
    setDateFinished(new Date().toISOString().split("T")[0]);
    setRating("7");
    setCountry("");
    setBonuses([null, null, null]);
    setHometownBonus(null);
    setDeduction(null);
  }

  async function handleSave() {
    if (!selectedBook || !seasonId || !currentOrgId) return;
    setSaving(true);
    try {
      const bookId = await findOrCreateBook({
        isbn: selectedBook.isbn,
        title: selectedBook.title,
        author: selectedBook.author,
        pages: pages || selectedBook.pages,
        year_published: selectedBook.year_published,
        country: country || null,
        cover_url: selectedBook.cover_url,
      });

      await createBookEntry({
        seasonId,
        orgId: currentOrgId,
        bookId,
        completed,
        fiction,
        seriesName: seriesName || null,
        genreId: genreId || null,
        dateFinished: completed ? dateFinished : null,
        rating: rating ? parseFloat(rating) : null,
        hometownBonus,
        bonus1: bonuses[0],
        bonus2: bonuses[1],
        bonus3: bonuses[2],
        deduction,
        pages: pages || selectedBook.pages,
      });

      resetForm();
      onClose();
    } catch (err) {
      console.error("Failed to save book entry:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add a Book</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4">
          {/* Search */}
          <BookSearch onSelect={handleBookSelect} />

          {/* Book details */}
          {selectedBook && (
            <>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-semibold">{selectedBook.title}</p>
                <p className="text-sm text-gray-500">{selectedBook.author}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Pages</Label>
                  <Input type="number" value={pages} onChange={(e) => setPages(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={fiction ? "fiction" : "nonfiction"} onValueChange={(v) => setFiction(v === "fiction")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fiction">Fiction</SelectItem>
                      <SelectItem value="nonfiction">Nonfiction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date Finished</Label>
                  <Input type="date" value={dateFinished} onChange={(e) => setDateFinished(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rating (0-10)</Label>
                  <Input type="number" min="0" max="10" step="0.5" value={rating} onChange={(e) => setRating(e.target.value)} />
                </div>
              </div>

              {genres.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Genre</Label>
                  <Select value={genreId} onValueChange={setGenreId}>
                    <SelectTrigger><SelectValue placeholder="Select genre..." /></SelectTrigger>
                    <SelectContent>
                      {genres.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Series Name (optional)</Label>
                <Input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} placeholder="e.g., Lord of the Rings" />
              </div>

              <div className="space-y-1.5">
                <Label>Country (author origin)</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., United States" />
              </div>

              {/* Bonuses */}
              <BonusChips selected={bonuses} onChange={setBonuses} />

              {/* Hometown bonus */}
              <div className="space-y-1.5">
                <Label>Hometown Bonus</Label>
                <Select value={hometownBonus ?? "none"} onValueChange={(v) => setHometownBonus(v === "none" ? null : v as HometownBonusKey)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Object.entries(HOMETOWN_BONUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deductions */}
              <DeductionChips selected={deduction} onChange={setDeduction} />

              {/* Live score */}
              <div className="sticky bottom-0 bg-white pt-2">
                <ScorePreview breakdown={scoreBreakdown} />
                <Button onClick={handleSave} className="w-full mt-3" disabled={saving}>
                  {saving ? "Saving..." : "Save Book Entry"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Update layout to pass seasonId and genres through OrgProvider**

Modify `src/app/(app)/layout.tsx` — add season and genre fetching, pass to OrgProvider:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizations, getActiveSeason, getOrgGenres } from "@/lib/queries/organizations";
import { OrgProvider } from "@/components/providers";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgs = await getUserOrganizations();

  if (orgs.length === 0) {
    redirect("/signup");
  }

  const initialOrgId = orgs[0]?.id ?? null;
  const season = initialOrgId ? await getActiveSeason(initialOrgId) : null;
  const genres = initialOrgId ? await getOrgGenres(initialOrgId) : [];

  return (
    <OrgProvider
      orgs={orgs}
      initialOrgId={initialOrgId}
      seasonId={season?.id ?? null}
      genres={genres.map((g) => ({ id: g.id, name: g.name }))}
    >
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
```

Then update `src/app/(app)/app-shell.tsx` to read from context and pass to `AddBookPanel`:

```tsx
"use client";

import { useState } from "react";
import { NavSidebar } from "@/components/nav-sidebar";
import { NavBottomTabs } from "@/components/nav-bottom-tabs";
import { AddBookPanel } from "@/components/add-book-panel";
import { useOrg } from "@/components/providers";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addBookOpen, setAddBookOpen] = useState(false);
  const { seasonId, genres } = useOrg();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavSidebar onAddBook={() => setAddBookOpen(true)} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <NavBottomTabs onAddBook={() => setAddBookOpen(true)} />
      <AddBookPanel
        open={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        genres={genres}
        seasonId={seasonId ?? undefined}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify add book flow**

```bash
npm run dev
```

1. Navigate to the app
2. Click "Add Book"
3. Search for a book (e.g., "Dune")
4. Select it from results
5. Verify fields auto-fill (pages, title, author)
6. Toggle bonuses/deductions
7. Verify live score updates in real time
8. Save the entry

Expected: book appears in My Books, leaderboard updates on next load.

- [ ] **Step 4: Commit**

```bash
git add src/components/add-book-panel.tsx src/components/providers.tsx src/app/\(app\)/
git commit -m "feat: implement full add book panel with search, live scoring, and entry creation"
```

---

## Chunk 6: Admin Screens & Progress Page

### Task 26: Admin Layout & Settings

**Files:**
- Create: `src/app/(app)/admin/layout.tsx`
- Create: `src/app/(app)/admin/settings/page.tsx`
- Create: `src/lib/queries/admin.ts`

- [ ] **Step 1: Create admin queries**

Create `src/lib/queries/admin.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function getOrgMembers(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("org_members")
    .select("*, profile:profiles(display_name)")
    .eq("org_id", orgId)
    .order("joined_at");

  return data ?? [];
}

export async function getFlaggedEntries(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("flagged_entries")
    .select("*, book_entry:book_entries(*, book:books(*), profile:profiles(display_name))")
    .eq("resolved", false);

  // Filter to entries within this org (via season)
  // The RLS policy already handles this, so all returned entries are in the admin's org
  return data ?? [];
}

export async function getScoringRules(orgId: string) {
  const supabase = await createClient();

  // Try org-specific first
  const { data: orgRules } = await supabase
    .from("scoring_rules")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (orgRules) return orgRules;

  // Fall back to global
  const { data: globalRules } = await supabase
    .from("scoring_rules")
    .select("*")
    .is("org_id", null)
    .single();

  return globalRules;
}
```

- [ ] **Step 2: Create admin layout with sub-navigation**

Create `src/app/(app)/admin/layout.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserOrganizations } from "@/lib/queries/organizations";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];

  if (!currentOrg || currentOrg.role !== "admin") {
    redirect("/leaderboard");
  }

  const tabs = [
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/players", label: "Players" },
    { href: "/admin/genres", label: "Genres" },
    { href: "/admin/scoring", label: "Scoring" },
    { href: "/admin/flagged", label: "Flagged" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Admin</h1>
      <div className="flex gap-1 mb-6 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap border-b-2 border-transparent hover:border-gray-300"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create admin settings page**

Create `src/app/(app)/admin/settings/page.tsx`:

```tsx
import { getUserOrganizations, getActiveSeason } from "@/lib/queries/organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const season = await getActiveSeason(currentOrg.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Competition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <p className="text-lg font-semibold">{currentOrg.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Invite Code</label>
            <p className="text-2xl font-mono font-bold tracking-widest">{currentOrg.invite_code}</p>
            <p className="text-xs text-gray-400 mt-1">Share this code or link: /join/{currentOrg.invite_code}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Season</CardTitle>
        </CardHeader>
        <CardContent>
          {season ? (
            <div>
              <p className="font-semibold">{season.name}</p>
              <p className="text-sm text-gray-500">Started: {season.start_date}</p>
              <p className="text-sm text-gray-500">Status: {season.status}</p>
            </div>
          ) : (
            <p className="text-gray-400">No active season</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/admin/ src/lib/queries/admin.ts
git commit -m "feat: add admin layout, settings page, and admin queries"
```

---

### Task 27: Admin Players Page

**Files:**
- Create: `src/app/(app)/admin/players/page.tsx`

- [ ] **Step 1: Create players management page**

Create `src/app/(app)/admin/players/page.tsx`:

```tsx
import { getUserOrganizations } from "@/lib/queries/organizations";
import { getOrgMembers } from "@/lib/queries/admin";
import { Badge } from "@/components/ui/badge";

export default async function AdminPlayersPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const members = await getOrgMembers(currentOrg.id);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Players ({members.length})</h2>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {members.map((member: any) => (
          <div key={member.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{member.profile?.display_name ?? "Unknown"}</p>
              <p className="text-xs text-gray-400">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
            </div>
            <Badge variant={member.role === "admin" ? "default" : "secondary"}>
              {member.role}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/admin/players/
git commit -m "feat: add admin players page"
```

---

### Task 28: Admin Genres Page

**Files:**
- Create: `src/app/(app)/admin/genres/page.tsx`
- Create: `src/lib/actions/admin.ts`

- [ ] **Step 1: Create admin server actions**

Create `src/lib/actions/admin.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addGenre(orgId: string, name: string) {
  const supabase = await createClient();

  const { data: maxOrder } = await supabase
    .from("genres")
    .select("sort_order")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("genres")
    .insert({ org_id: orgId, name, sort_order: nextOrder });

  if (error) return { error: error.message };
  revalidatePath("/admin/genres");
}

export async function removeGenre(genreId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("genres").delete().eq("id", genreId);

  if (error) return { error: error.message };
  revalidatePath("/admin/genres");
}

export async function updateScoringRules(rulesId: string, config: any) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("scoring_rules")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", rulesId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function resolveFlaggedEntry(flagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("flagged_entries")
    .update({ resolved: true, resolved_by: user?.id })
    .eq("id", flagId);

  if (error) return { error: error.message };
  revalidatePath("/admin/flagged");
}

export async function archiveSeason(seasonId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("seasons")
    .update({ status: "archived", end_date: new Date().toISOString().split("T")[0] })
    .eq("id", seasonId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

export async function createNewSeason(orgId: string, name: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("seasons")
    .insert({
      org_id: orgId,
      name,
      status: "active",
      start_date: new Date().toISOString().split("T")[0],
    });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}
```

- [ ] **Step 2: Create genres management page**

Create `src/app/(app)/admin/genres/page.tsx`:

```tsx
import { getOrgGenres, getUserOrganizations } from "@/lib/queries/organizations";
import { Badge } from "@/components/ui/badge";

export default async function AdminGenresPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const genres = await getOrgGenres(currentOrg.id);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Genre Challenge List</h2>
      <p className="text-sm text-gray-500">
        Players earn a bonus for covering all genres. Customize the list for your competition.
      </p>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Badge key={genre.id} variant="secondary" className="text-sm py-1.5 px-3">
            {genre.name}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Genre add/remove functionality will use client-side forms with the addGenre/removeGenre actions.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/admin/genres/ src/lib/actions/admin.ts
git commit -m "feat: add admin genres page and admin server actions"
```

---

### Task 29: Admin Scoring & Flagged Pages

**Files:**
- Create: `src/app/(app)/admin/scoring/page.tsx`
- Create: `src/app/(app)/admin/flagged/page.tsx`

- [ ] **Step 1: Create scoring rules page**

Create `src/app/(app)/admin/scoring/page.tsx`:

```tsx
import { getUserOrganizations } from "@/lib/queries/organizations";
import { getScoringRules } from "@/lib/queries/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoringRulesConfig } from "@/types/database";

export default async function AdminScoringPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const rules = await getScoringRules(currentOrg.id);
  const config = rules?.config as ScoringRulesConfig | undefined;

  if (!config) return <p className="text-gray-400">No scoring rules found.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Base Points</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Fiction:</span> <strong>{config.base_points.fiction}</strong></div>
          <div><span className="text-gray-500">Nonfiction:</span> <strong>{config.base_points.nonfiction}</strong></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Page Points</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">First 100:</span> <strong>{config.page_points.first_100_rate}/page</strong></div>
          <div><span className="text-gray-500">Beyond 100:</span> <strong>{config.page_points.beyond_100_rate}/page</strong></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bonuses</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.entries(config.bonuses).map(([key, pct]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
              <strong>+{((pct as number) * 100).toFixed(1)}%</strong>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Deductions</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.entries(config.deductions).map(([key, mult]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
              <strong>×{mult as number}</strong>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">
        Editing scoring rules will be enabled through inline forms calling updateScoringRules action.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create flagged entries page**

Create `src/app/(app)/admin/flagged/page.tsx`:

```tsx
import { getUserOrganizations } from "@/lib/queries/organizations";
import { getFlaggedEntries } from "@/lib/queries/admin";
import { Badge } from "@/components/ui/badge";

export default async function AdminFlaggedPage() {
  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const flagged = await getFlaggedEntries(currentOrg.id);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Flagged Entries</h2>
      {flagged.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No flagged entries. All clear! ✅</p>
      ) : (
        <div className="space-y-3">
          {flagged.map((flag: any) => (
            <div key={flag.id} className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{flag.book_entry?.book?.title ?? "Unknown"}</p>
                  <p className="text-sm text-gray-500">by {flag.book_entry?.profile?.display_name}</p>
                  <p className="text-sm text-gray-500">Points: {Number(flag.book_entry?.points ?? 0).toFixed(2)}</p>
                </div>
                <Badge variant="destructive">{flag.reason.replace("_", " ")}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/admin/scoring/ src/app/\(app\)/admin/flagged/
git commit -m "feat: add admin scoring rules display and flagged entries pages"
```

---

### Task 30: My Progress Page

**Files:**
- Create: `src/app/(app)/progress/page.tsx`
- Create: `src/components/genre-grid.tsx`
- Create: `src/components/alphabet-grid.tsx`

- [ ] **Step 1: Create genre challenge grid**

Create `src/components/genre-grid.tsx`:

```tsx
interface GenreGridProps {
  genres: Array<{ id: string; name: string }>;
  coveredGenreIds: Set<string>;
}

export function GenreGrid({ genres, coveredGenreIds }: GenreGridProps) {
  const covered = genres.filter((g) => coveredGenreIds.has(g.id)).length;
  const total = genres.length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-gray-900">Genre Challenge</h3>
        <span className="text-sm text-gray-500">{covered}/{total}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {genres.map((genre) => {
          const done = coveredGenreIds.has(genre.id);
          return (
            <div
              key={genre.id}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                done
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {done ? "✓ " : ""}{genre.name}
            </div>
          );
        })}
      </div>
      {covered === total && total > 0 && (
        <p className="text-sm text-green-600 font-medium">🎉 Genre challenge complete! +10% bonus</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create alphabet challenge grid**

Create `src/components/alphabet-grid.tsx`:

```tsx
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface AlphabetGridProps {
  coveredLetters: Set<string>;
}

export function AlphabetGrid({ coveredLetters }: AlphabetGridProps) {
  const count = coveredLetters.size;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-gray-900">Alphabet Challenge</h3>
        <span className="text-sm text-gray-500">{count}/26</span>
      </div>
      <div className="grid grid-cols-13 gap-1">
        {LETTERS.map((letter) => {
          const done = coveredLetters.has(letter);
          return (
            <div
              key={letter}
              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold ${
                done
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-300"
              }`}
            >
              {letter}
            </div>
          );
        })}
      </div>
      {count >= 26 && <p className="text-sm text-indigo-600 font-medium">🎉 All 26 letters! +14% bonus</p>}
      {count >= 13 && count < 26 && <p className="text-sm text-indigo-600 font-medium">📚 13+ letters! +6% bonus</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create progress page**

Create `src/app/(app)/progress/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { getUserBookEntries } from "@/lib/queries/books";
import { getActiveSeason, getUserOrganizations, getOrgGenres } from "@/lib/queries/organizations";
import { GenreGrid } from "@/components/genre-grid";
import { AlphabetGrid } from "@/components/alphabet-grid";

function getFirstLetter(title: string): string {
  return title.replace(/^(the|a|an)\s+/i, "").trim().charAt(0).toUpperCase();
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const orgs = await getUserOrganizations();
  const currentOrg = orgs[0];
  if (!currentOrg) return null;

  const season = await getActiveSeason(currentOrg.id);
  if (!season) return <div className="p-8 text-center">No active season.</div>;

  const entries = await getUserBookEntries(season.id, user.id);
  const genres = await getOrgGenres(currentOrg.id);

  // Genre coverage
  const coveredGenreIds = new Set(
    entries.map((e: any) => e.genre_id).filter(Boolean) as string[]
  );

  // Alphabet coverage
  const coveredLetters = new Set(
    entries.map((e: any) => getFirstLetter(e.book?.title ?? ""))
  );

  // Country coverage
  const countries = [...new Set(
    entries.map((e: any) => e.book?.country).filter(Boolean) as string[]
  )];

  // Stats
  const totalBooks = entries.length;
  const totalPages = entries.reduce((sum, e: any) => sum + (e.book?.pages ?? 0), 0);
  const totalPoints = entries.reduce((sum, e: any) => sum + Number(e.points), 0);
  const avgRating = totalBooks > 0
    ? entries.reduce((sum, e: any) => sum + (Number(e.rating) || 0), 0) / totalBooks
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-lg font-bold text-gray-900">My Progress</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Books", value: totalBooks },
          { label: "Pages", value: totalPages.toLocaleString() },
          { label: "Points", value: totalPoints.toFixed(1) },
          { label: "Avg Rating", value: avgRating.toFixed(1) },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Genre challenge */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <GenreGrid genres={genres} coveredGenreIds={coveredGenreIds} />
      </div>

      {/* Alphabet challenge */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <AlphabetGrid coveredLetters={coveredLetters} />
      </div>

      {/* Countries */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold text-gray-900">Countries Read</h3>
          <span className="text-sm text-gray-500">{countries.length} unique</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => (
            <span key={c} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
              {c}
            </span>
          ))}
          {countries.length === 0 && (
            <p className="text-sm text-gray-400">No countries recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify progress page**

```bash
npm run dev
```

Navigate to `localhost:3000/progress`. Expected: stats grid, genre challenge grid, alphabet grid, and countries list. All will be empty if no entries exist yet.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/progress/ src/components/genre-grid.tsx src/components/alphabet-grid.tsx
git commit -m "feat: add My Progress page with genre, alphabet, and country tracking"
```

---

### Task 31: Final Verification & Cleanup

**Files:**
- No new files

- [ ] **Step 1: Verify full application builds**

```bash
npm run build
```

Expected: Build succeeds with no errors. Address any TypeScript or build errors that arise.

- [ ] **Step 2: Test complete user flow**

1. Navigate to `localhost:3000` — should redirect to login
2. Sign up with email/password — should redirect to leaderboard
3. Leaderboard shows empty state (no competition yet)
4. Create a competition from the admin panel (if available) or via the database
5. Add a book via the "Add Book" panel — verify live score updates
6. Check My Books — entry should appear
7. Check My Progress — stats, genre grid, alphabet grid should reflect entry
8. Check Leaderboard — player should appear with correct points

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
