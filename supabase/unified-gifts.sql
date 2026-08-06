-- 통합 인벤토리(user_inventory.items/coins) 기반 아이템·클로버 선물
-- Supabase Dashboard → SQL Editor에서 전체 실행

do $$
begin
  if to_regclass('public.user_notifications') is not null then
    alter table public.user_notifications drop constraint if exists user_notifications_type_check;
    alter table public.user_notifications add constraint user_notifications_type_check check (
      type in ('friend_request', 'ilchon_request', 'photo_like', 'photo_comment', 'guestbook', 'gift')
    );
  end if;
end $$;

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
  v_official_listing_id text;
  v_gift_id uuid := gen_random_uuid();
  v_now timestamptz := now();
begin
  if v_sender_id is null then raise exception 'not authenticated'; end if;
  if p_recipient_id is null or p_recipient_id = v_sender_id then raise exception 'invalid recipient'; end if;
  if char_length(coalesce(p_message, '')) > 40 then raise exception 'message too long'; end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'recipient not found';
  end if;
  if not exists (
    select 1 from public.friendships
    where user_id = v_sender_id and friend_id = p_recipient_id
  ) then
    raise exception 'not friends';
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
  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_recipient_items, '[]'::jsonb)) as entry(value)
    where entry.value->>'id' = p_item_id
  ) then
    raise exception 'recipient already owns item';
  end if;

  v_item_label := coalesce(nullif(v_item->>'label', ''), '아이템');
  v_item := v_item || jsonb_build_object(
    'source', 'purchased',
    'avatarPlaced', false,
    'createdAt', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  select coalesce(jsonb_agg(entry.value order by entry.ordinality), '[]'::jsonb)
  into v_sender_items
  from jsonb_array_elements(coalesce(v_sender_items, '[]'::jsonb)) with ordinality as entry(value, ordinality)
  where entry.value->>'id' <> p_item_id;

  v_recipient_items := jsonb_build_array(v_item) || coalesce(v_recipient_items, '[]'::jsonb);

  if p_item_id like 'shop-item-%' then
    v_official_listing_id := 'global-listing-' || substring(p_item_id from 11);
    v_sender_owned := array_remove(coalesce(v_sender_owned, '{}'), v_official_listing_id);
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

  return jsonb_build_object('ok', true, 'item', v_item);
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
  if not exists (
    select 1 from public.friendships
    where user_id = v_sender_id and friend_id = p_recipient_id
  ) then
    raise exception 'not friends';
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

  return jsonb_build_object('ok', true, 'senderCoins', v_sender_coins - p_amount);
end;
$$;

revoke all on function public.send_unified_inventory_item_gift(uuid, text, text) from public;
revoke all on function public.send_unified_clover_gift(uuid, integer, text) from public;
grant execute on function public.send_unified_inventory_item_gift(uuid, text, text) to authenticated;
grant execute on function public.send_unified_clover_gift(uuid, integer, text) to authenticated;
