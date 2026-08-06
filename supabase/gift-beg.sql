-- Optional: gift-beg (조르기) notification RPC
-- Run in Supabase SQL Editor if you want cross-device persistence beyond World broadcast.
-- Safe to skip — app falls back to realtime broadcast + local notifications.

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
exception
  when duplicate_object then null;
end $$;

create or replace function public.send_gift_beg(
  recipient_id uuid,
  target_item_id text,
  beg_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_nickname text;
  item_label text;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;
  if me = recipient_id then
    return jsonb_build_object('ok', false, 'error', '나에게는 조를 수 없어요.');
  end if;

  select nickname into my_nickname from public.profiles where id = me;
  if my_nickname is null then my_nickname := '친구'; end if;

  select label into item_label from public.shop_items where id = target_item_id and active = true;
  if item_label is null then
    item_label := target_item_id;
  end if;

  if to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications (
      user_id, type, actor_id, actor_nickname, message, content, source_key
    ) values (
      recipient_id,
      'gift_beg',
      me,
      my_nickname,
      my_nickname || '님이 ' || item_label || '을(를) 조르고 있어요 🥺',
      nullif(trim(coalesce(beg_message, '')), ''),
      'gift_beg:' || me::text || ':' || recipient_id::text || ':' || target_item_id || ':' || extract(epoch from now())::bigint::text
    );
  end if;

  return jsonb_build_object('ok', true, 'item_id', target_item_id, 'item_label', item_label);
end;
$$;

grant execute on function public.send_gift_beg(uuid, text, text) to authenticated;
