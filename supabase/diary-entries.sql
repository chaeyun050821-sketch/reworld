-- 일기 저장 / 공개·비공개
-- Supabase Dashboard → SQL Editor → 실행

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

create index if not exists diary_entries_public_idx
  on public.diary_entries (user_id, privacy)
  where privacy = 'public';

grant select, insert, update, delete on public.diary_entries to authenticated;

alter table public.diary_entries enable row level security;

-- 본인: 전체 / 타인: 공개만
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
