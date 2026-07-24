-- ═══════════════════════════════════════════════════════════
-- Re:world 동기화 필수 SQL (아바타·미니룸·방명록·인벤토리·유저 상점)
-- Supabase Dashboard → SQL Editor → 전체 붙여넣기 → Run
-- ※ 마지막 줄 "Replication" 주석만 실행하면 안 됩니다!
-- ═══════════════════════════════════════════════════════════

-- 1) 테이블
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

create index if not exists guestbook_entries_owner_id_idx
  on public.guestbook_entries (owner_id, created_at desc);

-- 2) 권한 (authenticated 역할)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_avatars to authenticated;
grant select, insert, update, delete on public.user_minirooms to authenticated;
grant select, insert, update, delete on public.guestbook_entries to authenticated;

-- 3) RLS
alter table public.user_avatars enable row level security;
alter table public.user_minirooms enable row level security;
alter table public.guestbook_entries enable row level security;

-- user_avatars
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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_minirooms
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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- guestbook
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

-- 4) Realtime (방명록 실시간 — SQL로 활성화)
do $$
begin
  alter publication supabase_realtime add table public.guestbook_entries;
exception
  when duplicate_object then null;
  when others then
    raise notice 'Realtime publication skip: %', sqlerrm;
end $$;

-- 5) 확인용 (실행 후 3행 나오면 성공)
select 'user_avatars' as tbl, count(*) as rows from public.user_avatars
union all
select 'user_minirooms', count(*) from public.user_minirooms
union all
select 'guestbook_entries', count(*) from public.guestbook_entries;

-- ═══════════════════════════════════════════════════════════
-- 일기 (공개/비공개)
-- ═══════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════
-- 인벤토리 (핸드트래킹 아이템 · 상점 구매)
-- ═══════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════
-- 유저 상점 (내 상점 등록 → 다른 유저 전체 상점에 노출)
-- ═══════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════
-- 친구 상점 구매 RPC
-- ═══════════════════════════════════════════════════════════

create or replace function public.purchase_shop_listing(p_listing_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.shop_listings%rowtype;
  v_buyer uuid := auth.uid();
  v_buyer_coins integer;
  v_seller_coins integer;
  v_buyer_items jsonb;
  v_buyer_owned text[];
  v_purchased_item jsonb;
  v_purchased_id text;
  v_now timestamptz := now();
begin
  if v_buyer is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.shop_listings
  where id = p_listing_id and active = true
  for update;

  if not found then
    raise exception 'listing not found';
  end if;

  if v_row.seller_id = v_buyer then
    raise exception 'cannot buy your own listing';
  end if;

  insert into public.user_inventory (user_id, items, owned_listing_ids, coins)
  values (v_buyer, '[]'::jsonb, '{}', 500)
  on conflict (user_id) do nothing;

  insert into public.user_inventory (user_id, items, owned_listing_ids, coins)
  values (v_row.seller_id, '[]'::jsonb, '{}', 500)
  on conflict (user_id) do nothing;

  select coins, items, owned_listing_ids
  into v_buyer_coins, v_buyer_items, v_buyer_owned
  from public.user_inventory
  where user_id = v_buyer
  for update;

  select coins
  into v_seller_coins
  from public.user_inventory
  where user_id = v_row.seller_id
  for update;

  if coalesce(v_buyer_owned, '{}') @> array[p_listing_id] then
    raise exception 'already purchased';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_buyer_items, '[]'::jsonb)) as elem(value)
    where (elem.value->>'id') = v_row.item_id
       or (elem.value->>'id') like 'purchased-' || v_row.item_id || '-%'
  ) then
    raise exception 'already purchased';
  end if;

  if v_buyer_coins < v_row.price then
    raise exception 'insufficient coins';
  end if;

  v_purchased_id := 'purchased-' || v_row.item_id || '-' || (extract(epoch from v_now) * 1000)::bigint;
  v_purchased_item := v_row.item_snapshot || jsonb_build_object(
    'id', v_purchased_id,
    'source', 'purchased',
    'createdAt', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  v_buyer_items := jsonb_build_array(v_purchased_item) || coalesce(v_buyer_items, '[]'::jsonb);
  v_buyer_coins := v_buyer_coins - v_row.price;
  v_seller_coins := v_seller_coins + v_row.price;

  update public.user_inventory
  set
    coins = v_buyer_coins,
    items = v_buyer_items,
    owned_listing_ids = array_append(coalesce(v_buyer_owned, '{}'), p_listing_id),
    updated_at = v_now
  where user_id = v_buyer;

  update public.user_inventory
  set
    coins = v_seller_coins,
    updated_at = v_now
  where user_id = v_row.seller_id;

  return jsonb_build_object(
    'id', v_row.id,
    'itemId', v_row.item_id,
    'sellerId', v_row.seller_id,
    'sellerNickname', v_row.seller_nickname,
    'price', v_row.price,
    'listedAt', v_row.listed_at,
    'item', v_purchased_item,
    'buyerCoins', v_buyer_coins,
    'sellerCoins', v_seller_coins
  );
end;
$$;

grant execute on function public.purchase_shop_listing(text) to authenticated;
