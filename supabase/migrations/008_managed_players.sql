-- ============================================================
-- managed_players: links a parent user to a child they manage
-- ============================================================
create table public.managed_players (
  id uuid primary key default uuid_generate_v4(),
  parent_user_id uuid not null references auth.users on delete cascade,
  managed_user_id uuid not null references auth.users on delete cascade,
  org_id uuid not null references public.organizations on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_user_id, managed_user_id, org_id)
);

-- Prevent self-links
alter table public.managed_players
  add constraint managed_players_no_self_link
  check (parent_user_id <> managed_user_id);

-- ============================================================
-- Helper: returns managed user IDs for the current auth user
-- within a given org (or all orgs if called without filter)
-- ============================================================
create or replace function public.get_managed_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select managed_user_id
  from public.managed_players
  where parent_user_id = auth.uid();
$$;

-- ============================================================
-- RLS for managed_players
-- ============================================================
alter table public.managed_players enable row level security;

create policy "Parents can view their own managed players"
  on public.managed_players for select
  to authenticated
  using (parent_user_id = auth.uid());

create policy "Admins can view managed players in their orgs"
  on public.managed_players for select
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can insert managed player links"
  on public.managed_players for insert
  to authenticated
  with check (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Parents can insert their own managed player links"
  on public.managed_players for insert
  to authenticated
  with check (parent_user_id = auth.uid());

create policy "Admins can delete managed player links in their orgs"
  on public.managed_players for delete
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Parents can delete their own managed player links"
  on public.managed_players for delete
  to authenticated
  using (parent_user_id = auth.uid());

-- ============================================================
-- Additional book_entries RLS: parents can manage entries
-- for their managed players
-- ============================================================
create policy "Parents can insert entries for managed players"
  on public.book_entries for insert
  to authenticated
  with check (
    user_id in (select public.get_managed_user_ids())
  );

create policy "Parents can update entries for managed players"
  on public.book_entries for update
  to authenticated
  using (
    user_id in (select public.get_managed_user_ids())
  );

create policy "Parents can delete entries for managed players"
  on public.book_entries for delete
  to authenticated
  using (
    user_id in (select public.get_managed_user_ids())
  );
