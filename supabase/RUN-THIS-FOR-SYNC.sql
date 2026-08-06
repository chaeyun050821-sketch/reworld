-- ═══════════════════════════════════════════════════════════
-- Re:world 동기화 필수 SQL (아바타·미니룸·방명록·인벤토리·유저 상점·선물)
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
  with check (auth.uid() = seller_id and price between 1 and 150);

drop policy if exists "shop_listings_update_own" on public.shop_listings;
create policy "shop_listings_update_own"
  on public.shop_listings for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id and price between 1 and 150);

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

-- ═══════════════════════════════════════════════════════════
-- 통합 인벤토리 선물 (최신: gift-transfer.sql 과 동일)
-- ═══════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════
-- 아이템·클로버 선물 전송 (user_inventory 원자적 이전)
-- Supabase Dashboard → SQL Editor에서 이 파일 전체를 실행하세요.
--
-- 하는 일:
--   1) 알림 type 'gift' 허용
--   2) send_unified_inventory_item_gift — 보낸 사람 items에서 제거 → 받는 사람 items에 추가
--   3) send_unified_clover_gift — 클로버 이전
-- security definer 로 RLS를 우회해 양쪽 user_inventory를 한 트랜잭션에서 갱신합니다.
-- ═══════════════════════════════════════════════════════════

-- 필수 테이블이 없다면 최소 스키마 보장
create table if not exists public.user_inventory (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  owned_listing_ids text[] not null default '{}',
  coins integer not null default 500 check (coins >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_inventory
  add column if not exists coins integer not null default 500 check (coins >= 0);

alter table public.user_inventory enable row level security;

-- type CHECK 이름이 환경마다 다를 수 있어, type 관련 CHECK를 모두 제거 후 재생성
do $$
declare
  r record;
begin
  if to_regclass('public.user_notifications') is null then
    return;
  end if;

  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'user_notifications'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* '\ytype\y'
  loop
    execute format('alter table public.user_notifications drop constraint %I', r.conname);
  end loop;

  alter table public.user_notifications
    add constraint user_notifications_type_check check (
      type in (
        'friend_request', 'ilchon_request', 'photo_like', 'photo_comment',
        'guestbook', 'gift', 'gift_beg'
      )
    );
end $$;

-- 선물 수신 알림 보강 RPC (클라이언트 dual-write / 구버전 gift RPC 대응)
create or replace function public.notify_gift_received(
  p_recipient_id uuid,
  p_message text,
  p_content text default null,
  p_source_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_nickname text;
  v_source_key text;
  v_message text;
begin
  if v_sender_id is null then
    return jsonb_build_object('ok', false, 'error', 'not authenticated');
  end if;
  if p_recipient_id is null or p_recipient_id = v_sender_id then
    return jsonb_build_object('ok', false, 'error', 'invalid recipient');
  end if;
  if to_regclass('public.user_notifications') is null then
    return jsonb_build_object('ok', false, 'error', 'notifications unavailable');
  end if;

  select nickname into v_sender_nickname from public.profiles where id = v_sender_id;
  v_message := nullif(trim(coalesce(p_message, '')), '');
  if v_message is null then
    v_message := coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음') || '님이 선물을 보냈어요 🎁';
  end if;
  v_source_key := coalesce(
    nullif(trim(p_source_key), ''),
    'gift-notify:' || v_sender_id::text || ':' || p_recipient_id::text || ':' || gen_random_uuid()::text
  );

  insert into public.user_notifications (
    user_id, type, actor_id, actor_nickname, message, content, source_key
  ) values (
    p_recipient_id,
    'gift',
    v_sender_id,
    coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음'),
    v_message,
    nullif(trim(coalesce(p_content, '')), ''),
    v_source_key
  )
  on conflict (source_key) do nothing;

  return jsonb_build_object('ok', true, 'sourceKey', v_source_key);
end;
$$;

-- 카탈로그 id 추출: shop-item-x 또는 purchased-shop-item-x-123456 → shop-item-x
create or replace function public.gift_catalog_item_id(p_item_id text)
returns text
language sql
immutable
as $$
  select case
    when p_item_id ~ '^purchased-.+-[0-9]+$' then
      regexp_replace(p_item_id, '^purchased-(.+)-[0-9]+$', '\1')
    else p_item_id
  end;
$$;

create or replace function public.gift_official_listing_id(p_item_id text)
returns text
language sql
immutable
as $$
  select case
    when public.gift_catalog_item_id(p_item_id) like 'shop-item-%' then
      'global-listing-' || substring(public.gift_catalog_item_id(p_item_id) from 11)
    else null
  end;
$$;

-- 같은 공식 상점 아이템(원본/구매 복제) 보유 여부
create or replace function public.gift_inventory_owns_catalog(
  p_items jsonb,
  p_item_id text
)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as entry(value)
    where entry.value->>'id' = p_item_id
       or entry.value->>'id' = public.gift_catalog_item_id(p_item_id)
       or (
         public.gift_catalog_item_id(p_item_id) is not null
         and entry.value->>'id' like ('purchased-' || public.gift_catalog_item_id(p_item_id) || '-%')
       )
  );
$$;

create or replace function public.send_unified_inventory_item_gift(
  p_recipient_id uuid,
  p_item_id text,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_nickname text;
  v_sender_items jsonb;
  v_recipient_items jsonb;
  v_sender_owned text[];
  v_recipient_owned text[];
  v_item jsonb;
  v_item_label text;
  v_catalog_id text;
  v_official_listing_id text;
  v_gift_id uuid := gen_random_uuid();
  v_now timestamptz := now();
begin
  if v_sender_id is null then raise exception 'not authenticated'; end if;
  if p_recipient_id is null or p_recipient_id = v_sender_id then raise exception 'invalid recipient'; end if;
  if p_item_id is null or length(trim(p_item_id)) = 0 then raise exception 'item not found'; end if;
  if char_length(coalesce(p_message, '')) > 40 then raise exception 'message too long'; end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'recipient not found';
  end if;

  -- 친구 제한은 앱 UI(방문/일촌)에서 이미 걸러지며, WORLD 조르기 답례도 허용
  insert into public.user_inventory (user_id, items, owned_listing_ids, coins)
  values (v_sender_id, '[]'::jsonb, '{}', 500)
  on conflict (user_id) do nothing;
  insert into public.user_inventory (user_id, items, owned_listing_ids, coins)
  values (p_recipient_id, '[]'::jsonb, '{}', 500)
  on conflict (user_id) do nothing;

  perform user_id
  from public.user_inventory
  where user_id in (v_sender_id, p_recipient_id)
  order by user_id
  for update;

  select items, owned_listing_ids
  into v_sender_items, v_sender_owned
  from public.user_inventory
  where user_id = v_sender_id;

  select items, owned_listing_ids
  into v_recipient_items, v_recipient_owned
  from public.user_inventory
  where user_id = p_recipient_id;

  select entry.value into v_item
  from jsonb_array_elements(coalesce(v_sender_items, '[]'::jsonb)) as entry(value)
  where entry.value->>'id' = p_item_id
  limit 1;

  if v_item is null then raise exception 'item not found'; end if;

  if exists (
    select 1 from public.shop_listings
    where seller_id = v_sender_id and item_id = p_item_id and active = true
  ) then
    raise exception 'item is listed';
  end if;

  if public.gift_inventory_owns_catalog(v_recipient_items, p_item_id) then
    raise exception 'recipient already owns item';
  end if;

  v_catalog_id := public.gift_catalog_item_id(p_item_id);
  v_official_listing_id := public.gift_official_listing_id(p_item_id);

  if v_official_listing_id is not null
     and coalesce(v_recipient_owned, '{}') @> array[v_official_listing_id] then
    raise exception 'recipient already owns item';
  end if;

  v_item_label := coalesce(nullif(v_item->>'label', ''), '아이템');
  v_item := v_item || jsonb_build_object(
    'source', 'purchased',
    'avatarPlaced', false,
    'createdAt', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  -- 보낸 사람: 해당 id 제거 (+ 같은 카탈로그 공식 복제가 남아 있으면 함께 정리하지 않음 — 인스턴스 1개만 이전)
  select coalesce(jsonb_agg(entry.value order by entry.ordinality), '[]'::jsonb)
  into v_sender_items
  from jsonb_array_elements(coalesce(v_sender_items, '[]'::jsonb)) with ordinality as entry(value, ordinality)
  where entry.value->>'id' <> p_item_id;

  v_recipient_items := jsonb_build_array(v_item) || coalesce(v_recipient_items, '[]'::jsonb);

  if v_official_listing_id is not null then
    v_sender_owned := array_remove(coalesce(v_sender_owned, '{}'), v_official_listing_id);
    -- 보낸 사람 items에 같은 카탈로그가 더 없으면 owned 플래그 제거 유지
    if public.gift_inventory_owns_catalog(v_sender_items, v_catalog_id) then
      -- 드물게 동일 카탈로그 복제 보유 시 owned 유지
      if not (coalesce(v_sender_owned, '{}') @> array[v_official_listing_id]) then
        v_sender_owned := array_append(coalesce(v_sender_owned, '{}'), v_official_listing_id);
      end if;
    end if;
    if not (coalesce(v_recipient_owned, '{}') @> array[v_official_listing_id]) then
      v_recipient_owned := array_append(coalesce(v_recipient_owned, '{}'), v_official_listing_id);
    end if;
  end if;

  update public.user_inventory
  set items = v_sender_items,
      owned_listing_ids = coalesce(v_sender_owned, '{}'),
      updated_at = v_now
  where user_id = v_sender_id;

  update public.user_inventory
  set items = v_recipient_items,
      owned_listing_ids = coalesce(v_recipient_owned, '{}'),
      updated_at = v_now
  where user_id = p_recipient_id;

  select nickname into v_sender_nickname from public.profiles where id = v_sender_id;
  if to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications (
      user_id, type, actor_id, actor_nickname, message, content, source_key
    ) values (
      p_recipient_id,
      'gift',
      v_sender_id,
      coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음'),
      coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음') || '님이 ' || v_item_label || '을(를) 선물했어요 🎁',
      nullif(trim(p_message), ''),
      'gift-item:' || v_gift_id::text
    ) on conflict (source_key) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item', v_item,
    'itemId', p_item_id,
    'listingId', v_official_listing_id,
    'sourceKey', 'gift-item:' || v_gift_id::text,
    'notificationMessage', coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음') || '님이 ' || v_item_label || '을(를) 선물했어요 🎁'
  );
end;
$$;

create or replace function public.send_unified_clover_gift(
  p_recipient_id uuid,
  p_amount integer,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_nickname text;
  v_sender_coins integer;
  v_gift_id uuid := gen_random_uuid();
  v_now timestamptz := now();
begin
  if v_sender_id is null then raise exception 'not authenticated'; end if;
  if p_recipient_id is null or p_recipient_id = v_sender_id then raise exception 'invalid recipient'; end if;
  if p_amount is null or p_amount < 10 or p_amount > 5000 then raise exception 'invalid amount'; end if;
  if char_length(coalesce(p_message, '')) > 40 then raise exception 'message too long'; end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'recipient not found';
  end if;

  insert into public.user_inventory (user_id, items, owned_listing_ids, coins)
  values (v_sender_id, '[]'::jsonb, '{}', 500)
  on conflict (user_id) do nothing;
  insert into public.user_inventory (user_id, items, owned_listing_ids, coins)
  values (p_recipient_id, '[]'::jsonb, '{}', 500)
  on conflict (user_id) do nothing;

  perform user_id
  from public.user_inventory
  where user_id in (v_sender_id, p_recipient_id)
  order by user_id
  for update;

  select coins into v_sender_coins
  from public.user_inventory
  where user_id = v_sender_id;

  if v_sender_coins < p_amount then raise exception 'insufficient coins'; end if;

  update public.user_inventory
  set coins = coins - p_amount, updated_at = v_now
  where user_id = v_sender_id;
  update public.user_inventory
  set coins = coins + p_amount, updated_at = v_now
  where user_id = p_recipient_id;

  select nickname into v_sender_nickname from public.profiles where id = v_sender_id;
  if to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications (
      user_id, type, actor_id, actor_nickname, message, content, source_key
    ) values (
      p_recipient_id,
      'gift',
      v_sender_id,
      coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음'),
      coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음') || '님이 ' || p_amount || ' 클로버를 선물했어요 🍀',
      nullif(trim(p_message), ''),
      'gift-clover:' || v_gift_id::text
    ) on conflict (source_key) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'senderCoins', v_sender_coins - p_amount,
    'sourceKey', 'gift-clover:' || v_gift_id::text,
    'notificationMessage', coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음') || '님이 ' || p_amount || ' 클로버를 선물했어요 🍀'
  );
end;
$$;

revoke all on function public.gift_catalog_item_id(text) from public;
revoke all on function public.gift_official_listing_id(text) from public;
revoke all on function public.gift_inventory_owns_catalog(jsonb, text) from public;
revoke all on function public.notify_gift_received(uuid, text, text, text) from public;
revoke all on function public.send_unified_inventory_item_gift(uuid, text, text) from public;
revoke all on function public.send_unified_clover_gift(uuid, integer, text) from public;

grant execute on function public.notify_gift_received(uuid, text, text, text) to authenticated;
grant execute on function public.send_unified_inventory_item_gift(uuid, text, text) to authenticated;
grant execute on function public.send_unified_clover_gift(uuid, integer, text) to authenticated;

