-- 사용자 아바타 / 미니룸 / 방명록 (친구 방문·실시간 저장용)
-- ※ RUN-THIS-FOR-SYNC.sql 과 동일 — SQL Editor에서 전체 실행

create table if not exists public.user_avatars (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  body_color text not null default '#ffd0ad',
  pixel_map jsonb not null default '{}'::jsonb,
  equipped text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_minirooms (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  selections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  message text not null,
  color text not null default '#ff80c8',
  created_at timestamptz not null default now()
);

create index if not exists guestbook_entries_owner_id_idx on public.guestbook_entries (owner_id, created_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_avatars to authenticated;
grant select, insert, update, delete on public.user_minirooms to authenticated;
grant select, insert, update, delete on public.guestbook_entries to authenticated;

alter table public.user_avatars enable row level security;
alter table public.user_minirooms enable row level security;
alter table public.guestbook_entries enable row level security;

drop policy if exists "user_avatars_select" on public.user_avatars;
create policy "user_avatars_select"
  on public.user_avatars for select to authenticated using (true);

drop policy if exists "user_avatars_insert_own" on public.user_avatars;
create policy "user_avatars_insert_own"
  on public.user_avatars for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_avatars_update_own" on public.user_avatars;
create policy "user_avatars_update_own"
  on public.user_avatars for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_minirooms_select" on public.user_minirooms;
create policy "user_minirooms_select"
  on public.user_minirooms for select to authenticated using (true);

drop policy if exists "user_minirooms_insert_own" on public.user_minirooms;
create policy "user_minirooms_insert_own"
  on public.user_minirooms for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_minirooms_update_own" on public.user_minirooms;
create policy "user_minirooms_update_own"
  on public.user_minirooms for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "guestbook_select" on public.guestbook_entries;
create policy "guestbook_select"
  on public.guestbook_entries for select to authenticated using (true);

drop policy if exists "guestbook_insert" on public.guestbook_entries;
create policy "guestbook_insert"
  on public.guestbook_entries for insert to authenticated
  with check (auth.uid() = author_id and author_id is distinct from owner_id);

drop policy if exists "guestbook_delete_owner" on public.guestbook_entries;
create policy "guestbook_delete_owner"
  on public.guestbook_entries for delete to authenticated
  using (auth.uid() = owner_id);

do $$
begin
  alter publication supabase_realtime add table public.guestbook_entries;
exception
  when duplicate_object then null;
  when others then
    raise notice 'Realtime publication skip: %', sqlerrm;
end $$;

-- 일기
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  weather text not null default '☀️',
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  content text not null,
  stickers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diary_entries_user_id_idx
  on public.diary_entries (user_id, entry_date desc, created_at desc);

grant select, insert, update, delete on public.diary_entries to authenticated;

alter table public.diary_entries enable row level security;

drop policy if exists "diary_entries_select" on public.diary_entries;
create policy "diary_entries_select"
  on public.diary_entries for select to authenticated
  using (auth.uid() = user_id or privacy = 'public');

drop policy if exists "diary_entries_insert_own" on public.diary_entries;
create policy "diary_entries_insert_own"
  on public.diary_entries for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "diary_entries_update_own" on public.diary_entries;
create policy "diary_entries_update_own"
  on public.diary_entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "diary_entries_delete_own" on public.diary_entries;
create policy "diary_entries_delete_own"
  on public.diary_entries for delete to authenticated
  using (auth.uid() = user_id);
