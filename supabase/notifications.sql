-- 사용자 알림 저장 + 이벤트 트리거
-- Supabase SQL Editor에서 1회 실행

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'friend_request', 'ilchon_request', 'photo_like', 'photo_comment', 'guestbook'
  )),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_nickname text not null,
  message text not null,
  content text,
  request_id uuid,
  photo_id uuid,
  source_key text not null,
  created_at timestamptz not null default now(),
  constraint user_notifications_source_key_unique unique (source_key)
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

grant select, delete on public.user_notifications to authenticated;

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
  on public.user_notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_notifications_delete_own" on public.user_notifications;
create policy "user_notifications_delete_own"
  on public.user_notifications for delete to authenticated
  using (auth.uid() = user_id);

-- 알림 삽입 헬퍼 (트리거 전용)
create or replace function public._insert_user_notification(
  p_user_id uuid,
  p_type text,
  p_actor_id uuid,
  p_actor_nickname text,
  p_message text,
  p_content text default null,
  p_request_id uuid default null,
  p_photo_id uuid default null,
  p_source_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_actor_id is not null and p_user_id = p_actor_id then
    return;
  end if;

  insert into public.user_notifications (
    user_id, type, actor_id, actor_nickname, message, content, request_id, photo_id, source_key
  )
  values (
    p_user_id,
    p_type,
    p_actor_id,
    coalesce(nullif(trim(p_actor_nickname), ''), '알 수 없음'),
    p_message,
    p_content,
    p_request_id,
    p_photo_id,
    coalesce(p_source_key, p_type || ':' || gen_random_uuid()::text)
  )
  on conflict (source_key) do nothing;
end;
$$;

-- 친구 신청 알림
create or replace function public.trg_notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_nick text;
begin
  if TG_OP = 'INSERT' and NEW.status = 'pending' then
    select nickname into from_nick from public.profiles where id = NEW.from_user_id;
    perform public._insert_user_notification(
      NEW.to_user_id,
      'friend_request',
      NEW.from_user_id,
      from_nick,
      coalesce(from_nick, '알 수 없음') || '님이 친구 신청을 보냈어요',
      null,
      NEW.id,
      null,
      'friend_request:' || NEW.id::text
    );
  elsif TG_OP = 'UPDATE' and OLD.status = 'pending' and NEW.status <> 'pending' then
    delete from public.user_notifications
    where source_key = 'friend_request:' || NEW.id::text;
  end if;
  return NEW;
end;
$$;

drop trigger if exists notify_friend_request on public.friend_requests;
create trigger notify_friend_request
  after insert or update on public.friend_requests
  for each row execute function public.trg_notify_friend_request();

-- 일촌 신청 알림
create or replace function public.trg_notify_ilchon_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_nick text;
begin
  if TG_OP = 'INSERT' and NEW.status = 'pending' then
    select nickname into from_nick from public.profiles where id = NEW.from_user_id;
    perform public._insert_user_notification(
      NEW.to_user_id,
      'ilchon_request',
      NEW.from_user_id,
      from_nick,
      coalesce(from_nick, '알 수 없음') || '님이 일촌 신청을 보냈어요',
      null,
      NEW.id,
      null,
      'ilchon_request:' || NEW.id::text
    );
  elsif TG_OP = 'UPDATE' and OLD.status = 'pending' and NEW.status <> 'pending' then
    delete from public.user_notifications
    where source_key = 'ilchon_request:' || NEW.id::text;
  end if;
  return NEW;
end;
$$;

drop trigger if exists notify_ilchon_request on public.ilchon_requests;
create trigger notify_ilchon_request
  after insert or update on public.ilchon_requests
  for each row execute function public.trg_notify_ilchon_request();

-- 사진 좋아요 알림
create or replace function public.trg_notify_photo_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  liker_nick text;
begin
  select p.user_id into owner_id from public.user_photos p where p.id = NEW.photo_id;
  if owner_id is null then return NEW; end if;

  select nickname into liker_nick from public.profiles where id = NEW.user_id;
  perform public._insert_user_notification(
    owner_id,
    'photo_like',
    NEW.user_id,
    liker_nick,
    coalesce(liker_nick, '알 수 없음') || '님이 사진에 좋아요를 눌렀어요',
    null,
    null,
    NEW.photo_id,
    'photo_like:' || NEW.photo_id::text || ':' || NEW.user_id::text
  );
  return NEW;
end;
$$;

drop trigger if exists notify_photo_like on public.photo_likes;
create trigger notify_photo_like
  after insert on public.photo_likes
  for each row execute function public.trg_notify_photo_like();

-- 사진 댓글 알림
create or replace function public.trg_notify_photo_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  preview text;
begin
  select p.user_id into owner_id from public.user_photos p where p.id = NEW.photo_id;
  if owner_id is null then return NEW; end if;

  preview := left(trim(NEW.content), 40);
  if char_length(trim(NEW.content)) > 40 then
    preview := preview || '…';
  end if;

  perform public._insert_user_notification(
    owner_id,
    'photo_comment',
    NEW.author_id,
    NEW.author_nickname,
    coalesce(nullif(trim(NEW.author_nickname), ''), '알 수 없음') || '님이 사진에 댓글을 남겼어요',
    preview,
    null,
    NEW.photo_id,
    'photo_comment:' || NEW.id::text
  );
  return NEW;
end;
$$;

drop trigger if exists notify_photo_comment on public.photo_comments;
create trigger notify_photo_comment
  after insert on public.photo_comments
  for each row execute function public.trg_notify_photo_comment();

-- 방명록 알림
create or replace function public.trg_notify_guestbook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preview text;
begin
  preview := left(trim(NEW.message), 40);
  if char_length(trim(NEW.message)) > 40 then
    preview := preview || '…';
  end if;

  perform public._insert_user_notification(
    NEW.owner_id,
    'guestbook',
    NEW.author_id,
    NEW.author_name,
    coalesce(nullif(trim(NEW.author_name), ''), '알 수 없음') || '님이 방명록을 남겼어요',
    preview,
    null,
    null,
    'guestbook:' || NEW.id::text
  );
  return NEW;
end;
$$;

drop trigger if exists notify_guestbook on public.guestbook_entries;
create trigger notify_guestbook
  after insert on public.guestbook_entries
  for each row execute function public.trg_notify_guestbook();

-- 기존 데이터 백필 (최초 1회 호출)
create or replace function public.sync_user_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inserted_count integer := 0;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  insert into public.user_notifications (user_id, type, actor_id, actor_nickname, message, request_id, source_key, created_at)
  select
    r.to_user_id,
    'friend_request',
    r.from_user_id,
    coalesce(p.nickname, '알 수 없음'),
    coalesce(p.nickname, '알 수 없음') || '님이 친구 신청을 보냈어요',
    r.id,
    'friend_request:' || r.id::text,
    r.created_at
  from public.friend_requests r
  join public.profiles p on p.id = r.from_user_id
  where r.to_user_id = me and r.status = 'pending'
  on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;

  insert into public.user_notifications (user_id, type, actor_id, actor_nickname, message, request_id, source_key, created_at)
  select
    r.to_user_id,
    'ilchon_request',
    r.from_user_id,
    coalesce(p.nickname, '알 수 없음'),
    coalesce(p.nickname, '알 수 없음') || '님이 일촌 신청을 보냈어요',
    r.id,
    'ilchon_request:' || r.id::text,
    r.created_at
  from public.ilchon_requests r
  join public.profiles p on p.id = r.from_user_id
  where r.to_user_id = me and r.status = 'pending'
  on conflict (source_key) do nothing;

  insert into public.user_notifications (user_id, type, actor_id, actor_nickname, message, photo_id, source_key, created_at)
  select
    up.user_id,
    'photo_like',
    pl.user_id,
    coalesce(p.nickname, '알 수 없음'),
    coalesce(p.nickname, '알 수 없음') || '님이 사진에 좋아요를 눌렀어요',
    pl.photo_id,
    'photo_like:' || pl.photo_id::text || ':' || pl.user_id::text,
    pl.created_at
  from public.photo_likes pl
  join public.user_photos up on up.id = pl.photo_id
  join public.profiles p on p.id = pl.user_id
  where up.user_id = me and pl.user_id <> me
  on conflict (source_key) do nothing;

  insert into public.user_notifications (user_id, type, actor_id, actor_nickname, message, content, photo_id, source_key, created_at)
  select
    up.user_id,
    'photo_comment',
    pc.author_id,
    pc.author_nickname,
    coalesce(nullif(trim(pc.author_nickname), ''), '알 수 없음') || '님이 사진에 댓글을 남겼어요',
    case when char_length(trim(pc.content)) > 40 then left(trim(pc.content), 40) || '…' else trim(pc.content) end,
    pc.photo_id,
    'photo_comment:' || pc.id::text,
    pc.created_at
  from public.photo_comments pc
  join public.user_photos up on up.id = pc.photo_id
  where up.user_id = me and pc.author_id <> me
  on conflict (source_key) do nothing;

  insert into public.user_notifications (user_id, type, actor_id, actor_nickname, message, content, source_key, created_at)
  select
    g.owner_id,
    'guestbook',
    g.author_id,
    g.author_name,
    coalesce(nullif(trim(g.author_name), ''), '알 수 없음') || '님이 방명록을 남겼어요',
    case when char_length(trim(g.message)) > 40 then left(trim(g.message), 40) || '…' else trim(g.message) end,
    'guestbook:' || g.id::text,
    g.created_at
  from public.guestbook_entries g
  where g.owner_id = me
    and g.author_id is not null
    and g.author_id <> me
  on conflict (source_key) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.sync_user_notifications() to authenticated;

-- 실시간 알림
do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception
  when duplicate_object then null;
end $$;
