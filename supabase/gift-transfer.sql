-- ═══════════════════════════════════════════════════════════
-- 아이템·클로버 선물 전송 (user_inventory 원자적 이전)
-- Supabase Dashboard → SQL Editor에서 이 파일 전체를 실행하세요.
--
-- 하는 일:
--   1) 알림 type 'gift' / 'gift_beg' 허용 (기존 type CHECK를 모두 교체)
--   2) send_unified_inventory_item_gift — 보낸 사람 items에서 제거 → 받는 사람 items에 추가 + gift 알림
--   3) send_unified_clover_gift — 클로버 이전 + gift 알림
--   4) notify_gift_received — 클라이언트가 선물 성공 후 알림을 보강할 때 사용 (idempotent)
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

-- 선물 수신 알림 (RPC / 클라이언트 보강용). actor = 보낸 사람(auth.uid()).
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
  v_source_key text;
  v_notif_message text;
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
  v_source_key := 'gift-item:' || v_gift_id::text;
  v_notif_message :=
    coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음')
    || '님이 ' || v_item_label || '을(를) 선물했어요 🎁';

  if to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications (
      user_id, type, actor_id, actor_nickname, message, content, source_key
    ) values (
      p_recipient_id,
      'gift',
      v_sender_id,
      coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음'),
      v_notif_message,
      nullif(trim(p_message), ''),
      v_source_key
    ) on conflict (source_key) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item', v_item,
    'itemId', p_item_id,
    'listingId', v_official_listing_id,
    'sourceKey', v_source_key,
    'notificationMessage', v_notif_message
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
  v_source_key text;
  v_notif_message text;
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
  v_source_key := 'gift-clover:' || v_gift_id::text;
  v_notif_message :=
    coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음')
    || '님이 ' || p_amount || ' 클로버를 선물했어요 🍀';

  if to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications (
      user_id, type, actor_id, actor_nickname, message, content, source_key
    ) values (
      p_recipient_id,
      'gift',
      v_sender_id,
      coalesce(nullif(trim(v_sender_nickname), ''), '알 수 없음'),
      v_notif_message,
      nullif(trim(p_message), ''),
      v_source_key
    ) on conflict (source_key) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'senderCoins', v_sender_coins - p_amount,
    'sourceKey', v_source_key,
    'notificationMessage', v_notif_message
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
