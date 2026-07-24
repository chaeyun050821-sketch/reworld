-- 유저 상점 등록 (다른 사용자에게 노출)
-- Supabase SQL Editor에서 전체 실행

create table if not exists public.shop_listings (
  id text primary key,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  seller_nickname text not null,
  item_id text not null,
  item_snapshot jsonb not null,
  price integer not null check (price > 0),
  listed_at timestamptz not null default now(),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists shop_listings_active_listed_at
  on public.shop_listings (active, listed_at desc);

create index if not exists shop_listings_seller_item
  on public.shop_listings (seller_id, item_id)
  where active;

grant select, insert, update, delete on public.shop_listings to authenticated;

alter table public.shop_listings enable row level security;

drop policy if exists "shop_listings_select_active" on public.shop_listings;
create policy "shop_listings_select_active"
  on public.shop_listings for select to authenticated
  using (active = true);

drop policy if exists "shop_listings_insert_own" on public.shop_listings;
create policy "shop_listings_insert_own"
  on public.shop_listings for insert to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "shop_listings_update_own" on public.shop_listings;
create policy "shop_listings_update_own"
  on public.shop_listings for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "shop_listings_delete_own" on public.shop_listings;
create policy "shop_listings_delete_own"
  on public.shop_listings for delete to authenticated
  using (auth.uid() = seller_id);
