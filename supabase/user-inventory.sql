-- 사용자 인벤토리 (핸드트래킹 아이템 · 상점 구매 · 배치/회전 정보)
-- Supabase SQL Editor에서 전체 실행

create table if not exists public.user_inventory (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  owned_listing_ids text[] not null default '{}',
  coins integer not null default 500 check (coins >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_inventory
  add column if not exists coins integer not null default 500 check (coins >= 0);

grant select, insert, update, delete on public.user_inventory to authenticated;

alter table public.user_inventory enable row level security;

drop policy if exists "user_inventory_select" on public.user_inventory;
create policy "user_inventory_select"
  on public.user_inventory for select to authenticated
  using (true);

drop policy if exists "user_inventory_insert_own" on public.user_inventory;
create policy "user_inventory_insert_own"
  on public.user_inventory for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_inventory_update_own" on public.user_inventory;
create policy "user_inventory_update_own"
  on public.user_inventory for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_inventory_delete_own" on public.user_inventory;
create policy "user_inventory_delete_own"
  on public.user_inventory for delete to authenticated
  using (auth.uid() = user_id);
