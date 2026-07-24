-- profiles / friendships RLS 수정 (친구 닉네임 검색용)
-- Supabase SQL Editor에서 1회 실행

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles
  for select
  to authenticated, anon
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
  on public.friendships
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own"
  on public.friendships
  for insert
  to authenticated
  with check (auth.uid() = user_id and friend_id <> auth.uid());

drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own"
  on public.friendships
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 닉네임 정확 검색용 RPC (RLS/중복 닉네임 이슈 우회)
create or replace function public.find_profile_by_nickname(
  search_nickname text,
  exclude_user_id uuid default null
)
returns table (id uuid, nickname text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nickname
  from public.profiles p
  where lower(trim(p.nickname)) = lower(trim(search_nickname))
    and (exclude_user_id is null or p.id <> exclude_user_id)
  order by p.id asc
  limit 1;
$$;

revoke all on function public.find_profile_by_nickname(text, uuid) from public;
grant execute on function public.find_profile_by_nickname(text, uuid) to authenticated;
