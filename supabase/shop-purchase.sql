-- 유저 상점 구매 (네잎클로버 · 복사본 지급 · listing 유지 · 판매자 원본 유지)
-- Supabase SQL Editor에서 실행

alter table public.user_inventory
  add column if not exists coins integer not null default 500 check (coins >= 0);

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
