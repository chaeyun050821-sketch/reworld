-- Re:world Supabase schema
-- Supabase Dashboard → SQL Editor → New query → 붙여넣기 → Run

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_nickname_lower_key
  on public.profiles (lower(nickname));

alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 친구 목록 (닉네임으로 추가, 본인 기준 one-way)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_id),
  constraint friendships_unique unique (user_id, friend_id)
);

create index if not exists friendships_user_id_idx on public.friendships (user_id);

alter table public.friendships enable row level security;

create policy "friendships_select_own"
  on public.friendships for select
  using (auth.uid() = user_id);

create policy "friendships_insert_own"
  on public.friendships for insert
  with check (auth.uid() = user_id and friend_id <> auth.uid());

create policy "friendships_delete_own"
  on public.friendships for delete
  using (auth.uid() = user_id);

-- 기존 가입 유저 중 profiles 행이 없는 경우 백필 (1회 실행)
-- insert into public.profiles (id, nickname)
-- select
--   u.id,
--   coalesce(nullif(trim(u.raw_user_meta_data->>'nickname'), ''), split_part(u.email, '@', 1))
-- from auth.users u
-- where not exists (select 1 from public.profiles p where p.id = u.id)
-- on conflict (id) do nothing;
