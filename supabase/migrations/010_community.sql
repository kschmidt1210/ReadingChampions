-- ============================================================
-- Community feed: per-org posts with threaded comments,
-- arbitrary-emoji reactions, and image attachments.
-- ============================================================

-- ============================================================
-- community_posts: top-level posts in an org's shared feed
-- ============================================================
create table public.community_posts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  body text not null check (char_length(body) <= 4000),
  tag text check (tag in ('recommendation', 'rules', 'leaderboard', 'milestone', 'general')),
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_org_created_idx
  on public.community_posts (org_id, created_at desc);
create index community_posts_user_idx
  on public.community_posts (user_id);

-- ============================================================
-- community_comments: threaded comments on a post.
-- parent_comment_id is null for top-level comments.
-- deleted_at supports soft-delete tombstones so a removed
-- parent still anchors its children.
-- ============================================================
create table public.community_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.community_posts on delete cascade,
  parent_comment_id uuid references public.community_comments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  body text not null check (char_length(body) <= 2000),
  image_paths text[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_comments_post_created_idx
  on public.community_comments (post_id, created_at asc);
create index community_comments_parent_idx
  on public.community_comments (parent_comment_id);

-- Trigger: parent_comment_id must reference a comment on the same post.
create or replace function public.community_check_comment_parent()
returns trigger as $$
declare
  parent_post_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select post_id into parent_post_id
  from public.community_comments
  where id = new.parent_comment_id;

  if parent_post_id is null then
    raise exception 'parent_comment_id % not found', new.parent_comment_id;
  end if;

  if parent_post_id <> new.post_id then
    raise exception 'parent_comment_id must belong to the same post (parent post: %, new post: %)',
      parent_post_id, new.post_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger community_comments_check_parent
  before insert or update of parent_comment_id, post_id on public.community_comments
  for each row execute function public.community_check_comment_parent();

-- ============================================================
-- community_reactions: any-emoji reactions on posts or comments.
-- target_type is polymorphic; cleanup is handled in delete server actions.
-- ============================================================
create table public.community_reactions (
  id uuid primary key default uuid_generate_v4(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id, emoji)
);

create index community_reactions_target_idx
  on public.community_reactions (target_type, target_id);

-- ============================================================
-- Helper: org_id for a given community post (used by RLS).
-- ============================================================
create or replace function public.community_post_org(p_post_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.community_posts where id = p_post_id;
$$;

-- ============================================================
-- Helper: org_id for a given community comment (used by RLS).
-- ============================================================
create or replace function public.community_comment_org(p_comment_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id
  from public.community_comments c
  join public.community_posts p on p.id = c.post_id
  where c.id = p_comment_id;
$$;

-- ============================================================
-- RLS: community_posts
-- ============================================================
alter table public.community_posts enable row level security;

create policy "Org members can view community posts"
  on public.community_posts for select
  to authenticated
  using (
    org_id in (select public.get_user_org_ids())
  );

create policy "Org members can create community posts"
  on public.community_posts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and org_id in (select public.get_user_org_ids())
  );

create policy "Authors can update their community posts"
  on public.community_posts for update
  to authenticated
  using (user_id = auth.uid());

create policy "Authors can delete their community posts"
  on public.community_posts for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can delete community posts in their orgs"
  on public.community_posts for delete
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- RLS: community_comments
-- ============================================================
alter table public.community_comments enable row level security;

create policy "Org members can view community comments"
  on public.community_comments for select
  to authenticated
  using (
    public.community_post_org(post_id) in (select public.get_user_org_ids())
  );

create policy "Org members can create community comments"
  on public.community_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.community_post_org(post_id) in (select public.get_user_org_ids())
  );

create policy "Authors can update their community comments"
  on public.community_comments for update
  to authenticated
  using (user_id = auth.uid());

create policy "Authors can delete their community comments"
  on public.community_comments for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can update community comments in their orgs"
  on public.community_comments for update
  to authenticated
  using (
    public.community_post_org(post_id) in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete community comments in their orgs"
  on public.community_comments for delete
  to authenticated
  using (
    public.community_post_org(post_id) in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- RLS: community_reactions
-- ============================================================
alter table public.community_reactions enable row level security;

create policy "Org members can view reactions"
  on public.community_reactions for select
  to authenticated
  using (
    case target_type
      when 'post' then public.community_post_org(target_id) in (select public.get_user_org_ids())
      when 'comment' then public.community_comment_org(target_id) in (select public.get_user_org_ids())
      else false
    end
  );

create policy "Org members can react"
  on public.community_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and case target_type
      when 'post' then public.community_post_org(target_id) in (select public.get_user_org_ids())
      when 'comment' then public.community_comment_org(target_id) in (select public.get_user_org_ids())
      else false
    end
  );

create policy "Users can remove their own reactions"
  on public.community_reactions for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can remove reactions in their orgs"
  on public.community_reactions for delete
  to authenticated
  using (
    case target_type
      when 'post' then public.community_post_org(target_id) in (
        select org_id from public.org_members
        where user_id = auth.uid() and role = 'admin'
      )
      when 'comment' then public.community_comment_org(target_id) in (
        select org_id from public.org_members
        where user_id = auth.uid() and role = 'admin'
      )
      else false
    end
  );

-- ============================================================
-- Storage bucket: community-images
-- Path convention: {org_id}/posts/{post_id}/{filename}
--                  {org_id}/comments/{comment_id}/{filename}
-- ============================================================
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', false)
on conflict (id) do nothing;

-- Storage RLS: org membership scoped via the first path segment.
create policy "Org members can read community images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'community-images'
    and (
      case
        when (storage.foldername(name))[1] is null then false
        else (storage.foldername(name))[1]::uuid in (select public.get_user_org_ids())
      end
    )
  );

create policy "Org members can upload community images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-images'
    and owner = auth.uid()
    and (
      case
        when (storage.foldername(name))[1] is null then false
        else (storage.foldername(name))[1]::uuid in (select public.get_user_org_ids())
      end
    )
  );

create policy "Owners can delete their own community images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-images'
    and owner = auth.uid()
  );

create policy "Admins can delete community images in their orgs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-images'
    and (
      case
        when (storage.foldername(name))[1] is null then false
        else (storage.foldername(name))[1]::uuid in (
          select org_id from public.org_members
          where user_id = auth.uid() and role = 'admin'
        )
      end
    )
  );
