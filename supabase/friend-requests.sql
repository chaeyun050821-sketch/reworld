-- 친구 신청 / 수락 / 삭제 + 활동중(last_seen)
-- Supabase SQL Editor에서 실행

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (from_user_id <> to_user_id),
  constraint friend_requests_unique_pair unique (from_user_id, to_user_id)
);

create index if not exists friend_requests_to_pending_idx
  on public.friend_requests (to_user_id, created_at desc)
  where status = 'pending';

create index if not exists friend_requests_from_idx
  on public.friend_requests (from_user_id, created_at desc);

grant select, insert, update, delete on public.friend_requests to authenticated;

alter table public.friend_requests enable row level security;

drop policy if exists "friend_requests_select" on public.friend_requests;
create policy "friend_requests_select"
  on public.friend_requests for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "friend_requests_insert" on public.friend_requests;
create policy "friend_requests_insert"
  on public.friend_requests for insert to authenticated
  with check (auth.uid() = from_user_id and from_user_id <> to_user_id);

drop policy if exists "friend_requests_update" on public.friend_requests;
create policy "friend_requests_update"
  on public.friend_requests for update to authenticated
  using (auth.uid() = to_user_id or auth.uid() = from_user_id)
  with check (auth.uid() = to_user_id or auth.uid() = from_user_id);

drop policy if exists "friend_requests_delete" on public.friend_requests;
create policy "friend_requests_delete"
  on public.friend_requests for delete to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- 친구 삭제 시 양방향 행 제거 가능하도록
drop policy if exists "friendships_delete_own" on public.friendships;
drop policy if exists "friendships_delete_related" on public.friendships;
create policy "friendships_delete_related"
  on public.friendships for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- 친구 신청 보내기
create or replace function public.send_friend_request(target_nickname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target public.profiles%rowtype;
  existing_friend uuid;
  existing_req public.friend_requests%rowtype;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  select * into target
  from public.profiles p
  where lower(trim(p.nickname)) = lower(trim(target_nickname))
    and p.id <> me
  order by p.id
  limit 1;

  if target.id is null then
    return jsonb_build_object('ok', false, 'error', '해당 닉네임의 유저를 찾지 못했어요.');
  end if;

  select f.friend_id into existing_friend
  from public.friendships f
  where f.user_id = me and f.friend_id = target.id
  limit 1;

  if existing_friend is not null then
    return jsonb_build_object('ok', false, 'error', '이미 친구예요.');
  end if;

  select * into existing_req
  from public.friend_requests r
  where r.from_user_id = me and r.to_user_id = target.id
  limit 1;

  if existing_req.id is not null then
    if existing_req.status = 'pending' then
      return jsonb_build_object('ok', false, 'error', '이미 친구 신청을 보냈어요.');
    end if;
    update public.friend_requests
      set status = 'pending', updated_at = now()
      where id = existing_req.id;
    return jsonb_build_object('ok', true, 'request_id', existing_req.id, 'nickname', target.nickname);
  end if;

  -- 상대가 이미 나에게 신청한 경우 → 바로 수락 유도
  select * into existing_req
  from public.friend_requests r
  where r.from_user_id = target.id and r.to_user_id = me and r.status = 'pending'
  limit 1;

  if existing_req.id is not null then
    return jsonb_build_object(
      'ok', false,
      'error', '상대가 이미 친구 신청을 보냈어요. 받은 신청에서 수락해 주세요.',
      'incoming_request_id', existing_req.id
    );
  end if;

  insert into public.friend_requests (from_user_id, to_user_id, status)
  values (me, target.id, 'pending')
  returning id into existing_req.id;

  return jsonb_build_object('ok', true, 'request_id', existing_req.id, 'nickname', target.nickname);
end;
$$;

-- 친구 신청 수락 (양방향 friendships 생성)
create or replace function public.accept_friend_request(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req public.friend_requests%rowtype;
  from_nick text;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  select * into req from public.friend_requests where id = request_id;
  if req.id is null then
    return jsonb_build_object('ok', false, 'error', '신청을 찾을 수 없어요.');
  end if;
  if req.to_user_id <> me then
    return jsonb_build_object('ok', false, 'error', '이 신청을 수락할 권한이 없어요.');
  end if;
  if req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', '이미 처리된 신청이에요.');
  end if;

  update public.friend_requests
    set status = 'accepted', updated_at = now()
    where id = req.id;

  insert into public.friendships (user_id, friend_id)
  values (me, req.from_user_id)
  on conflict do nothing;

  insert into public.friendships (user_id, friend_id)
  values (req.from_user_id, me)
  on conflict do nothing;

  select nickname into from_nick from public.profiles where id = req.from_user_id;

  return jsonb_build_object(
    'ok', true,
    'friend_user_id', req.from_user_id,
    'nickname', coalesce(from_nick, ''),
    'added_at', now()
  );
end;
$$;

create or replace function public.reject_friend_request(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req public.friend_requests%rowtype;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  select * into req from public.friend_requests where id = request_id;
  if req.id is null then
    return jsonb_build_object('ok', false, 'error', '신청을 찾을 수 없어요.');
  end if;
  if req.to_user_id <> me and req.from_user_id <> me then
    return jsonb_build_object('ok', false, 'error', '권한이 없어요.');
  end if;

  update public.friend_requests
    set status = 'rejected', updated_at = now()
    where id = req.id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_friendship(target_friend_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  delete from public.friendships
  where (user_id = me and friend_id = target_friend_id)
     or (user_id = target_friend_id and friend_id = me);

  update public.friend_requests
    set status = 'rejected', updated_at = now()
  where status = 'pending'
    and (
      (from_user_id = me and to_user_id = target_friend_id)
      or (from_user_id = target_friend_id and to_user_id = me)
    );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.send_friend_request(text) from public;
revoke all on function public.accept_friend_request(uuid) from public;
revoke all on function public.reject_friend_request(uuid) from public;
revoke all on function public.remove_friendship(uuid) from public;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.reject_friend_request(uuid) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;
