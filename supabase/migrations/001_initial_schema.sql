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
    or invite_code is not null
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
