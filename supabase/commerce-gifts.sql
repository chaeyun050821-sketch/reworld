-- Re:world 상점/보관함/클로버/선물 시스템
-- Supabase SQL Editor에서 1회 실행

create table if not exists public.shop_items (
  id text primary key,
  kind text not null check (kind in ('interior', 'avatar', 'emoticon')),
  category text not null,
  label text not null,
  price integer not null check (price > 0),
  giftable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.shop_items (id, kind, category, label, price, giftable) values
  ('interior-tricolor-cat','interior','인테리어','삼색고양이',280,true),
  ('interior-heart-balloon','interior','인테리어','하트풍선',240,true),
  ('interior-mushroom-lamp','interior','인테리어','버섯 조명',320,true),
  ('interior-record-player','interior','인테리어','빈티지 턴테이블',420,true),
  ('interior-aquarium','interior','인테리어','미니 어항',460,true),
  ('interior-teddy','interior','인테리어','리본 곰인형',260,true),
  ('interior-monstera','interior','인테리어','몬스테라 화분',210,true),
  ('interior-heart-rug','interior','인테리어','하트 러그',300,true),
  ('interior-moon-light','interior','인테리어','문라이트',350,true),
  ('interior-pc-desk','interior','인테리어','레트로 PC 데스크',520,true),
  ('interior-gallery','interior','인테리어','폴라로이드 액자',190,true),
  ('interior-retro-radio','interior','인테리어','레트로 라디오',270,true),
  ('avatar-pink-hoodie','avatar','의상','핑크 후드티',260,true),
  ('avatar-sailor','avatar','의상','세일러복',360,true),
  ('avatar-cardigan','avatar','의상','아이보리 가디건',310,true),
  ('avatar-overalls','avatar','의상','데님 멜빵',340,true),
  ('avatar-pleats','avatar','의상','네이비 플리츠',280,true),
  ('avatar-cargo','avatar','의상','베이지 카고팬츠',280,true),
  ('avatar-ribbon','avatar','액세서리','체리 리본핀',160,true),
  ('avatar-flower','avatar','액세서리','데이지 꽃핀',150,true),
  ('avatar-sneakers','avatar','액세서리','크림 스니커즈',220,true),
  ('avatar-crossbag','avatar','액세서리','미니 크로스백',240,true),
  ('emoticon-laugh','emoticon','이모티콘','빵터짐',90,true),
  ('emoticon-cry','emoticon','이모티콘','주르륵',90,true),
  ('emoticon-angry','emoticon','이모티콘','부글부글',90,true),
  ('emoticon-shock','emoticon','이모티콘','깜짝',100,true),
  ('emoticon-love','emoticon','이모티콘','사랑해',110,true),
  ('emoticon-party','emoticon','이모티콘','축하해',110,true),
  ('emoticon-sleep','emoticon','이모티콘','쿨쿨',90,true),
  ('emoticon-best','emoticon','이모티콘','최고야',100,true)
on conflict (id) do update set
  kind = excluded.kind,
  category = excluded.category,
  label = excluded.label,
  price = excluded.price,
  giftable = excluded.giftable,
  active = true;

create table if not exists public.user_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance bigint not null default 1500 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_inventory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.shop_items (id) on delete restrict,
  quantity integer not null default 1 check (quantity >= 0),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  seller_nickname text not null,
  item_id text not null references public.shop_items (id) on delete restrict,
  price integer not null check (price between 1 and 999999),
  listed_at timestamptz not null default now()
);

create index if not exists marketplace_listings_seller_idx
  on public.marketplace_listings (seller_id, listed_at desc);

create table if not exists public.commerce_gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  gift_kind text not null check (gift_kind in ('item', 'clover')),
  item_id text references public.shop_items (id) on delete restrict,
  amount integer,
  message text check (message is null or char_length(message) <= 40),
  created_at timestamptz not null default now(),
  constraint commerce_gifts_no_self check (sender_id <> recipient_id),
  constraint commerce_gifts_payload check (
    (gift_kind = 'item' and item_id is not null and amount is null)
    or (gift_kind = 'clover' and item_id is null and amount between 10 and 5000)
  )
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  transaction_type text not null check (transaction_type in ('purchase', 'sale', 'gift_sent', 'gift_received')),
  reference_id uuid,
  created_at timestamptz not null default now()
);

grant select on public.shop_items to authenticated;
grant select on public.marketplace_listings to authenticated;
grant select on public.user_wallets, public.user_inventory, public.commerce_gifts, public.wallet_transactions to authenticated;

alter table public.shop_items enable row level security;
alter table public.user_wallets enable row level security;
alter table public.user_inventory enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.commerce_gifts enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "shop_items_read" on public.shop_items;
create policy "shop_items_read" on public.shop_items for select to authenticated using (active = true);
drop policy if exists "wallet_read_own" on public.user_wallets;
create policy "wallet_read_own" on public.user_wallets for select to authenticated using (auth.uid() = user_id);
drop policy if exists "inventory_read_own" on public.user_inventory;
create policy "inventory_read_own" on public.user_inventory for select to authenticated using (auth.uid() = user_id);
drop policy if exists "listings_read" on public.marketplace_listings;
create policy "listings_read" on public.marketplace_listings for select to authenticated using (true);
drop policy if exists "gifts_read_participant" on public.commerce_gifts;
create policy "gifts_read_participant" on public.commerce_gifts for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "wallet_transactions_read_own" on public.wallet_transactions;
create policy "wallet_transactions_read_own" on public.wallet_transactions for select to authenticated using (auth.uid() = user_id);

-- 신규 기능의 선물 알림 타입 허용
do $$
begin
  if to_regclass('public.user_notifications') is not null then
    alter table public.user_notifications drop constraint if exists user_notifications_type_check;
    alter table public.user_notifications add constraint user_notifications_type_check check (
      type in ('friend_request', 'ilchon_request', 'photo_like', 'photo_comment', 'guestbook', 'gift')
    );
  end if;
end $$;

create or replace function public.bootstrap_commerce()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.'); end if;

  insert into public.user_wallets (user_id, balance) values (me, 1500) on conflict (user_id) do nothing;
  insert into public.user_inventory (user_id, item_id, quantity)
    select me, i.id, 1 from public.shop_items i where i.active = true
    on conflict (user_id, item_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.create_marketplace_listing(target_item_id text, target_price integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_nickname text;
  owned integer;
  reserved integer;
  new_id uuid;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.'); end if;
  if target_price is null or target_price < 1 or target_price > 999999 then
    return jsonb_build_object('ok', false, 'error', '가격은 1~999,999 클로버로 입력해 주세요.');
  end if;
  perform public.bootstrap_commerce();

  select quantity into owned from public.user_inventory where user_id = me and item_id = target_item_id for update;
  select count(*) into reserved from public.marketplace_listings where seller_id = me and item_id = target_item_id;
  if coalesce(owned, 0) <= reserved then return jsonb_build_object('ok', false, 'error', '판매 가능한 수량이 없어요.'); end if;

  select nickname into my_nickname from public.profiles where id = me;
  insert into public.marketplace_listings (seller_id, seller_nickname, item_id, price)
  values (me, coalesce(my_nickname, '알 수 없음'), target_item_id, target_price)
  returning id into new_id;
  return jsonb_build_object('ok', true, 'listing_id', new_id);
end;
$$;

create or replace function public.cancel_marketplace_listing(listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  deleted_count integer;
begin
  delete from public.marketplace_listings where id = listing_id and seller_id = me;
  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then return jsonb_build_object('ok', false, 'error', '판매글을 찾지 못했어요.'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.buy_marketplace_listing(listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  listing public.marketplace_listings%rowtype;
  my_balance bigint;
  seller_quantity integer;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.'); end if;
  select * into listing from public.marketplace_listings where id = listing_id for update;
  if listing.id is null then return jsonb_build_object('ok', false, 'error', '이미 판매된 아이템이에요.'); end if;
  if listing.seller_id = me then return jsonb_build_object('ok', false, 'error', '내 아이템은 구매할 수 없어요.'); end if;

  perform public.bootstrap_commerce();
  insert into public.user_wallets (user_id, balance) values (listing.seller_id, 1500) on conflict (user_id) do nothing;
  select balance into my_balance from public.user_wallets where user_id = me for update;
  if my_balance < listing.price then return jsonb_build_object('ok', false, 'error', '클로버가 부족해요.'); end if;

  select quantity into seller_quantity from public.user_inventory
    where user_id = listing.seller_id and item_id = listing.item_id for update;
  if coalesce(seller_quantity, 0) < 1 then return jsonb_build_object('ok', false, 'error', '판매자의 보유 수량이 부족해요.'); end if;

  update public.user_wallets set balance = balance - listing.price, updated_at = now() where user_id = me;
  update public.user_wallets set balance = balance + listing.price, updated_at = now() where user_id = listing.seller_id;
  update public.user_inventory set quantity = quantity - 1 where user_id = listing.seller_id and item_id = listing.item_id;
  insert into public.user_inventory (user_id, item_id, quantity) values (me, listing.item_id, 1)
    on conflict (user_id, item_id) do update set quantity = public.user_inventory.quantity + 1, acquired_at = now();
  delete from public.marketplace_listings where id = listing.id;

  insert into public.wallet_transactions (user_id, amount, transaction_type, reference_id) values
    (me, -listing.price, 'purchase', listing.id),
    (listing.seller_id, listing.price, 'sale', listing.id);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.send_item_gift(recipient_id uuid, target_item_id text, gift_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_nickname text;
  item_label text;
  item_giftable boolean;
  owned integer;
  reserved integer;
  gift_id uuid;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.'); end if;
  if recipient_id is null or recipient_id = me then return jsonb_build_object('ok', false, 'error', '선물 대상이 올바르지 않아요.'); end if;
  if char_length(coalesce(gift_message, '')) > 40 then return jsonb_build_object('ok', false, 'error', '메시지는 40자 이하로 입력해 주세요.'); end if;
  if not exists (select 1 from public.friendships where user_id = me and friend_id = recipient_id) then
    return jsonb_build_object('ok', false, 'error', '친구에게만 선물할 수 있어요.');
  end if;
  perform public.bootstrap_commerce();
  insert into public.user_wallets (user_id, balance) values (recipient_id, 1500) on conflict (user_id) do nothing;

  select label, giftable into item_label, item_giftable from public.shop_items where id = target_item_id and active = true;
  if item_label is null or not item_giftable then return jsonb_build_object('ok', false, 'error', '선물할 수 없는 아이템이에요.'); end if;
  select quantity into owned from public.user_inventory where user_id = me and item_id = target_item_id for update;
  select count(*) into reserved from public.marketplace_listings where seller_id = me and item_id = target_item_id;
  if coalesce(owned, 0) <= reserved then return jsonb_build_object('ok', false, 'error', '선물 가능한 수량이 없어요.'); end if;

  update public.user_inventory set quantity = quantity - 1 where user_id = me and item_id = target_item_id;
  insert into public.user_inventory (user_id, item_id, quantity) values (recipient_id, target_item_id, 1)
    on conflict (user_id, item_id) do update set quantity = public.user_inventory.quantity + 1, acquired_at = now();
  insert into public.commerce_gifts (sender_id, recipient_id, gift_kind, item_id, message)
    values (me, recipient_id, 'item', target_item_id, nullif(trim(gift_message), '')) returning id into gift_id;

  select nickname into my_nickname from public.profiles where id = me;
  if to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications (user_id, type, actor_id, actor_nickname, message, content, source_key)
    values (recipient_id, 'gift', me, coalesce(my_nickname, '알 수 없음'), coalesce(my_nickname, '알 수 없음') || '님이 ' || item_label || '을(를) 선물했어요 🎁', nullif(trim(gift_message), ''), 'gift:' || gift_id::text)
    on conflict (source_key) do nothing;
  end if;
  return jsonb_build_object('ok', true, 'gift_id', gift_id);
end;
$$;

create or replace function public.send_clover_gift(recipient_id uuid, gift_amount integer, gift_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_nickname text;
  my_balance bigint;
  gift_id uuid;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.'); end if;
  if recipient_id is null or recipient_id = me then return jsonb_build_object('ok', false, 'error', '선물 대상이 올바르지 않아요.'); end if;
  if gift_amount is null or gift_amount < 10 or gift_amount > 5000 then return jsonb_build_object('ok', false, 'error', '클로버는 한 번에 10~5,000개까지 선물할 수 있어요.'); end if;
  if char_length(coalesce(gift_message, '')) > 40 then return jsonb_build_object('ok', false, 'error', '메시지는 40자 이하로 입력해 주세요.'); end if;
  if not exists (select 1 from public.friendships where user_id = me and friend_id = recipient_id) then
    return jsonb_build_object('ok', false, 'error', '친구에게만 선물할 수 있어요.');
  end if;
  perform public.bootstrap_commerce();
  insert into public.user_wallets (user_id, balance) values (recipient_id, 1500) on conflict (user_id) do nothing;
  select balance into my_balance from public.user_wallets where user_id = me for update;
  if my_balance < gift_amount then return jsonb_build_object('ok', false, 'error', '클로버가 부족해요.'); end if;

  update public.user_wallets set balance = balance - gift_amount, updated_at = now() where user_id = me;
  update public.user_wallets set balance = balance + gift_amount, updated_at = now() where user_id = recipient_id;
  insert into public.commerce_gifts (sender_id, recipient_id, gift_kind, amount, message)
    values (me, recipient_id, 'clover', gift_amount, nullif(trim(gift_message), '')) returning id into gift_id;
  insert into public.wallet_transactions (user_id, amount, transaction_type, reference_id) values
    (me, -gift_amount, 'gift_sent', gift_id),
    (recipient_id, gift_amount, 'gift_received', gift_id);

  select nickname into my_nickname from public.profiles where id = me;
  if to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications (user_id, type, actor_id, actor_nickname, message, content, source_key)
    values (recipient_id, 'gift', me, coalesce(my_nickname, '알 수 없음'), coalesce(my_nickname, '알 수 없음') || '님이 ' || gift_amount || ' 클로버를 선물했어요 🍀', nullif(trim(gift_message), ''), 'gift:' || gift_id::text)
    on conflict (source_key) do nothing;
  end if;
  return jsonb_build_object('ok', true, 'gift_id', gift_id);
end;
$$;

revoke all on function public.bootstrap_commerce() from public;
revoke all on function public.create_marketplace_listing(text, integer) from public;
revoke all on function public.cancel_marketplace_listing(uuid) from public;
revoke all on function public.buy_marketplace_listing(uuid) from public;
revoke all on function public.send_item_gift(uuid, text, text) from public;
revoke all on function public.send_clover_gift(uuid, integer, text) from public;

grant execute on function public.bootstrap_commerce() to authenticated;
grant execute on function public.create_marketplace_listing(text, integer) to authenticated;
grant execute on function public.cancel_marketplace_listing(uuid) to authenticated;
grant execute on function public.buy_marketplace_listing(uuid) to authenticated;
grant execute on function public.send_item_gift(uuid, text, text) to authenticated;
grant execute on function public.send_clover_gift(uuid, integer, text) to authenticated;
