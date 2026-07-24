-- 사진첩 (업로드 + 포토부스 그라데이션)
-- Supabase SQL Editor에서 실행

create table if not exists public.user_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'upload' check (kind in ('upload', 'gradient')),
  src_value text not null,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_photos_user_created_idx
  on public.user_photos (user_id, created_at desc);

grant select, insert, update, delete on public.user_photos to authenticated;

alter table public.user_photos enable row level security;

drop policy if exists "user_photos_select" on public.user_photos;
create policy "user_photos_select"
  on public.user_photos for select to authenticated
  using (true);

drop policy if exists "user_photos_insert_own" on public.user_photos;
create policy "user_photos_insert_own"
  on public.user_photos for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_photos_update_own" on public.user_photos;
create policy "user_photos_update_own"
  on public.user_photos for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_photos_delete_own" on public.user_photos;
create policy "user_photos_delete_own"
  on public.user_photos for delete to authenticated
  using (auth.uid() = user_id);

-- Storage bucket (공개 읽기, 본인만 업로드)
insert into storage.buckets (id, name, public)
values ('user-photos', 'user-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "user_photos_storage_select" on storage.objects;
create policy "user_photos_storage_select"
  on storage.objects for select to authenticated, anon
  using (bucket_id = 'user-photos');

drop policy if exists "user_photos_storage_insert" on storage.objects;
create policy "user_photos_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_photos_storage_update" on storage.objects;
create policy "user_photos_storage_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_photos_storage_delete" on storage.objects;
create policy "user_photos_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
