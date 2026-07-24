-- 사진첩 조회수 · 하트 · 댓글 · 이모티콘 공감
-- Supabase SQL Editor에서 1회 실행

alter table public.user_photos
  add column if not exists view_count integer not null default 0;

create table if not exists public.photo_likes (
  photo_id uuid not null references public.user_photos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create index if not exists photo_likes_photo_id_idx
  on public.photo_likes (photo_id);

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.user_photos (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_nickname text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint photo_comments_content_len check (char_length(content) between 1 and 300)
);

create index if not exists photo_comments_photo_id_idx
  on public.photo_comments (photo_id, created_at asc);

create table if not exists public.photo_reactions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.user_photos (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  actor_name text not null,
  emoticon_id integer not null,
  created_at timestamptz not null default now()
);

create index if not exists photo_reactions_photo_id_idx
  on public.photo_reactions (photo_id, created_at asc);

grant select, insert, delete on public.photo_likes to authenticated;
grant select, insert, delete on public.photo_comments to authenticated;
grant select, insert, delete on public.photo_reactions to authenticated;

alter table public.photo_likes enable row level security;
alter table public.photo_comments enable row level security;
alter table public.photo_reactions enable row level security;

drop policy if exists "photo_likes_select" on public.photo_likes;
create policy "photo_likes_select"
  on public.photo_likes for select to authenticated using (true);

drop policy if exists "photo_likes_insert_own" on public.photo_likes;
create policy "photo_likes_insert_own"
  on public.photo_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "photo_likes_delete_own" on public.photo_likes;
create policy "photo_likes_delete_own"
  on public.photo_likes for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "photo_comments_select" on public.photo_comments;
create policy "photo_comments_select"
  on public.photo_comments for select to authenticated using (true);

drop policy if exists "photo_comments_insert_own" on public.photo_comments;
create policy "photo_comments_insert_own"
  on public.photo_comments for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "photo_comments_delete_own" on public.photo_comments;
create policy "photo_comments_delete_own"
  on public.photo_comments for delete to authenticated
  using (auth.uid() = author_id);

drop policy if exists "photo_reactions_select" on public.photo_reactions;
create policy "photo_reactions_select"
  on public.photo_reactions for select to authenticated using (true);

drop policy if exists "photo_reactions_insert_own" on public.photo_reactions;
create policy "photo_reactions_insert_own"
  on public.photo_reactions for insert to authenticated
  with check (auth.uid() = actor_id);

drop policy if exists "photo_reactions_delete_own" on public.photo_reactions;
create policy "photo_reactions_delete_own"
  on public.photo_reactions for delete to authenticated
  using (auth.uid() = actor_id);

create or replace function public.increment_photo_view(p_photo_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.user_photos
  set view_count = view_count + 1,
      updated_at = now()
  where id = p_photo_id
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_photo_view(uuid) to authenticated;
