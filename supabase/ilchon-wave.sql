-- 일촌 (이웃과 별도 — 서로 수락해야 등록) + 파도타기 목록 조회
-- Supabase SQL Editor에서 실행

create table if not exists public.ilchon_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ilchon_requests_no_self check (from_user_id <> to_user_id),
  constraint ilchon_requests_unique_pair unique (from_user_id, to_user_id)
);

create index if not exists ilchon_requests_to_pending_idx
  on public.ilchon_requests (to_user_id, created_at desc)
  where status = 'pending';

create index if not exists ilchon_requests_from_idx
  on public.ilchon_requests (from_user_id, created_at desc);

grant select, insert, update, delete on public.ilchon_requests to authenticated;

alter table public.ilchon_requests enable row level security;

drop policy if exists "ilchon_requests_select" on public.ilchon_requests;
create policy "ilchon_requests_select"
  on public.ilchon_requests for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "ilchon_requests_insert" on public.ilchon_requests;
create policy "ilchon_requests_insert"
  on public.ilchon_requests for insert to authenticated
  with check (auth.uid() = from_user_id and from_user_id <> to_user_id);

drop policy if exists "ilchon_requests_update" on public.ilchon_requests;
create policy "ilchon_requests_update"
  on public.ilchon_requests for update to authenticated
  using (auth.uid() = to_user_id or auth.uid() = from_user_id)
  with check (auth.uid() = to_user_id or auth.uid() = from_user_id);

-- 일촌 관계 (수락 시 양방향 행 생성)
create table if not exists public.ilchons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ilchon_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint ilchons_no_self check (user_id <> ilchon_id),
  constraint ilchons_unique unique (user_id, ilchon_id)
);

create index if not exists ilchons_user_id_idx on public.ilchons (user_id);

grant select, delete on public.ilchons to authenticated;

alter table public.ilchons enable row level security;

drop policy if exists "ilchons_select_own" on public.ilchons;
create policy "ilchons_select_own"
  on public.ilchons for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ilchons_delete_own" on public.ilchons;
create policy "ilchons_delete_own"
  on public.ilchons for delete to authenticated
  using (auth.uid() = user_id);

-- 일촌 신청 (이웃만 가능)
create or replace function public.send_ilchon_request(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target public.profiles%rowtype;
  is_neighbor boolean;
  existing_ilchon uuid;
  existing_req public.ilchon_requests%rowtype;
  incoming_req public.ilchon_requests%rowtype;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  if target_user_id is null or target_user_id = me then
    return jsonb_build_object('ok', false, 'error', '일촌 신청 대상이 올바르지 않아요.');
  end if;

  select * into target from public.profiles where id = target_user_id;
  if target.id is null then
    return jsonb_build_object('ok', false, 'error', '유저를 찾지 못했어요.');
  end if;

  select exists(
    select 1 from public.friendships f
    where f.user_id = me and f.friend_id = target_user_id
  ) into is_neighbor;

  if not is_neighbor then
    return jsonb_build_object('ok', false, 'error', '이웃만 일촌 신청을 할 수 있어요.');
  end if;

  select i.ilchon_id into existing_ilchon
  from public.ilchons i
  where i.user_id = me and i.ilchon_id = target_user_id
  limit 1;

  if existing_ilchon is not null then
    return jsonb_build_object('ok', false, 'error', '이미 일촌이에요.');
  end if;

  select * into existing_req
  from public.ilchon_requests r
  where r.from_user_id = me and r.to_user_id = target_user_id
  limit 1;

  if existing_req.id is not null then
    if existing_req.status = 'pending' then
      return jsonb_build_object('ok', false, 'error', '이미 일촌 신청을 보냈어요.');
    end if;
    update public.ilchon_requests
      set status = 'pending', updated_at = now()
      where id = existing_req.id;
    return jsonb_build_object('ok', true, 'request_id', existing_req.id, 'nickname', target.nickname);
  end if;

  select * into incoming_req
  from public.ilchon_requests r
  where r.from_user_id = target_user_id and r.to_user_id = me and r.status = 'pending'
  limit 1;

  if incoming_req.id is not null then
    return jsonb_build_object(
      'ok', false,
      'error', '상대가 이미 일촌 신청을 보냈어요. 받은 신청에서 수락해 주세요.',
      'incoming_request_id', incoming_req.id
    );
  end if;

  insert into public.ilchon_requests (from_user_id, to_user_id, status)
  values (me, target_user_id, 'pending')
  returning id into existing_req.id;

  return jsonb_build_object('ok', true, 'request_id', existing_req.id, 'nickname', target.nickname);
end;
$$;

-- 일촌 신청 수락
create or replace function public.accept_ilchon_request(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req public.ilchon_requests%rowtype;
  from_nick text;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  select * into req from public.ilchon_requests where id = request_id;
  if req.id is null then
    return jsonb_build_object('ok', false, 'error', '신청을 찾지 못했어요.');
  end if;
  if req.to_user_id <> me then
    return jsonb_build_object('ok', false, 'error', '이 신청을 수락할 권한이 없어요.');
  end if;
  if req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', '이미 처리된 신청이에요.');
  end if;

  update public.ilchon_requests
    set status = 'accepted', updated_at = now()
    where id = req.id;

  insert into public.ilchons (user_id, ilchon_id)
  values (me, req.from_user_id)
  on conflict do nothing;

  insert into public.ilchons (user_id, ilchon_id)
  values (req.from_user_id, me)
  on conflict do nothing;

  select nickname into from_nick from public.profiles where id = req.from_user_id;

  return jsonb_build_object(
    'ok', true,
    'ilchon_user_id', req.from_user_id,
    'nickname', coalesce(from_nick, ''),
    'added_at', now()
  );
end;
$$;

create or replace function public.reject_ilchon_request(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req public.ilchon_requests%rowtype;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  select * into req from public.ilchon_requests where id = request_id;
  if req.id is null then
    return jsonb_build_object('ok', false, 'error', '신청을 찾지 못했어요.');
  end if;
  if req.to_user_id <> me and req.from_user_id <> me then
    return jsonb_build_object('ok', false, 'error', '권한이 없어요.');
  end if;

  update public.ilchon_requests
    set status = 'rejected', updated_at = now()
    where id = req.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- 파도타기용: 특정 유저의 일촌 목록 (방문자도 조회 가능)
create or replace function public.get_ilchon_list(owner_id uuid)
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

  if owner_id is null then
    return jsonb_build_object('ok', false, 'error', '대상 유저가 없어요.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'ilchons', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'ilchon_user_id', i.ilchon_id,
          'nickname', p.nickname,
          'added_at', i.created_at
        )
        order by i.created_at desc
      )
      from public.ilchons i
      join public.profiles p on p.id = i.ilchon_id
      where i.user_id = owner_id
        and p.nickname is not null
        and trim(p.nickname) <> ''
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.send_ilchon_request(uuid) from public;
revoke all on function public.accept_ilchon_request(uuid) from public;
revoke all on function public.reject_ilchon_request(uuid) from public;
revoke all on function public.get_ilchon_list(uuid) from public;

grant execute on function public.send_ilchon_request(uuid) to authenticated;
grant execute on function public.accept_ilchon_request(uuid) to authenticated;
grant execute on function public.reject_ilchon_request(uuid) to authenticated;
grant execute on function public.get_ilchon_list(uuid) to authenticated;
