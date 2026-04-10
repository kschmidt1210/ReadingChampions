-- ============================================================
-- book_reviews: one review per book entry, with public/private visibility
-- ============================================================
create table public.book_reviews (
  id uuid primary key default uuid_generate_v4(),
  book_entry_id uuid not null unique references public.book_entries on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  review_text text not null check (char_length(review_text) <= 5000),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index book_reviews_user_id_idx on public.book_reviews (user_id);

-- ============================================================
-- Row Level Security Policies
-- ============================================================
alter table public.book_reviews enable row level security;

-- Users can always see their own reviews.
-- Public reviews are visible to members of the same org (via the book entry's season).
create policy "Users can view own reviews and public reviews in org"
  on public.book_reviews for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      visibility = 'public'
      and book_entry_id in (
        select be.id from public.book_entries be
        join public.seasons s on s.id = be.season_id
        join public.org_members om on om.org_id = s.org_id
        where om.user_id = auth.uid()
      )
    )
  );

-- Users can insert reviews for their own entries
create policy "Users can insert their own reviews"
  on public.book_reviews for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own reviews
create policy "Users can update their own reviews"
  on public.book_reviews for update
  to authenticated
  using (user_id = auth.uid());

-- Users can delete their own reviews
create policy "Users can delete their own reviews"
  on public.book_reviews for delete
  to authenticated
  using (user_id = auth.uid());
