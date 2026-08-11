-- 사용자별 일촌명(별명) 저장 + send/accept RPC를 클라이언트가 호출하는 2-인자 시그니처로 맞춤
-- 선행: supabase/ilchon-wave.sql
-- PostgREST 오류 예: Could not find the function public.send_ilchon_request(target_display_name, target_user_id)
-- → 이 파일을 Supabase SQL Editor에서 실행한 뒤, 필요하면 Dashboard → Settings → API → Reload schema

alter table public.ilchon_requests add column if not exists requester_alias text;
alter table public.ilchons add column if not exists display_name text;

update public.ilchons i
set display_name = p.nickname
from public.profiles p
where p.id = i.ilchon_id
  and (i.display_name is null or trim(i.display_name) = '');

alter table public.ilchon_requests drop constraint if exists ilchon_requests_requester_alias_check;
alter table public.ilchon_requests add constraint ilchon_requests_requester_alias_check check (
  requester_alias is null or (char_length(trim(requester_alias)) between 1 and 12 and requester_alias !~ E'[\\n\\r\\t]')
);

alter table public.ilchons drop constraint if exists ilchons_display_name_check;
alter table public.ilchons add constraint ilchons_display_name_check check (
  display_name is null or (char_length(trim(display_name)) between 1 and 12 and display_name !~ E'[\\n\\r\\t]')
);

-- 구버전 1-인자 오버로드 제거 (클라이언트가 보내는 named args와 불일치)
drop function if exists public.send_ilchon_request(uuid);
drop function if exists public.accept_ilchon_request(uuid);

-- 신청자가 상대를 부를 일촌명을 함께 저장 (src/lib/ilchon.ts 와 동일 파라미터명)
create or replace function public.send_ilchon_request(target_user_id uuid, target_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  normalized text := regexp_replace(trim(coalesce(target_display_name, '')), E'[\\n\\r\\t]+', ' ', 'g');
  target public.profiles%rowtype;
  is_neighbor boolean;
  existing_ilchon uuid;
  existing_req public.ilchon_requests%rowtype;
  incoming_req public.ilchon_requests%rowtype;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  if char_length(normalized) < 1 or char_length(normalized) > 12 then
    return jsonb_build_object('ok', false, 'error', '일촌명은 1~12자로 입력해 주세요.');
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
      set status = 'pending', requester_alias = normalized, updated_at = now()
      where id = existing_req.id;
    return jsonb_build_object(
      'ok', true,
      'request_id', existing_req.id,
      'nickname', target.nickname,
      'requester_alias', normalized
    );
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

  insert into public.ilchon_requests (from_user_id, to_user_id, status, requester_alias)
  values (me, target_user_id, 'pending', normalized)
  returning id into existing_req.id;

  return jsonb_build_object(
    'ok', true,
    'request_id', existing_req.id,
    'nickname', target.nickname,
    'requester_alias', normalized
  );
end;
$$;

-- 수락자가 신청자를 부를 일촌명을 정하고, 양방향 행에 각자의 일촌명을 저장한다.
create or replace function public.accept_ilchon_request(request_id uuid, target_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  normalized text := regexp_replace(trim(coalesce(target_display_name, '')), E'[\\n\\r\\t]+', ' ', 'g');
  req public.ilchon_requests%rowtype;
  from_nick text;
  requester_default text;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.');
  end if;

  if char_length(normalized) < 1 or char_length(normalized) > 12 then
    return jsonb_build_object('ok', false, 'error', '일촌명은 1~12자로 입력해 주세요.');
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
  select nickname into requester_default from public.profiles where id = req.to_user_id;

  update public.ilchons
    set display_name = normalized
    where user_id = req.to_user_id and ilchon_id = req.from_user_id;
  update public.ilchons
    set display_name = coalesce(nullif(trim(req.requester_alias), ''), requester_default)
    where user_id = req.from_user_id and ilchon_id = req.to_user_id;

  return jsonb_build_object(
    'ok', true,
    'ilchon_user_id', req.from_user_id,
    'nickname', coalesce(from_nick, ''),
    'display_name', normalized,
    'added_at', now()
  );
end;
$$;

create or replace function public.update_ilchon_display_name(target_user_id uuid, target_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  normalized text := regexp_replace(trim(coalesce(target_display_name, '')), E'[\\n\\r\\t]+', ' ', 'g');
  updated_count integer;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.'); end if;
  if char_length(normalized) < 1 or char_length(normalized) > 12 then
    return jsonb_build_object('ok', false, 'error', '일촌명은 1~12자로 입력해 주세요.');
  end if;

  update public.ilchons set display_name = normalized
    where user_id = me and ilchon_id = target_user_id;
  get diagnostics updated_count = row_count;
  if updated_count = 0 then return jsonb_build_object('ok', false, 'error', '일촌 관계를 찾지 못했어요.'); end if;
  return jsonb_build_object('ok', true, 'display_name', normalized);
end;
$$;

create or replace function public.get_ilchon_list(owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return jsonb_build_object('ok', false, 'error', '로그인이 필요해요.'); end if;
  if owner_id is null then return jsonb_build_object('ok', false, 'error', '대상 유저가 없어요.'); end if;

  return jsonb_build_object(
    'ok', true,
    'ilchons', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'ilchon_user_id', i.ilchon_id,
          'nickname', p.nickname,
          'display_name', coalesce(nullif(trim(i.display_name), ''), p.nickname),
          'added_at', i.created_at
        ) order by i.created_at desc
      )
      from public.ilchons i
      join public.profiles p on p.id = i.ilchon_id
      where i.user_id = owner_id and p.nickname is not null and trim(p.nickname) <> ''
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.send_ilchon_request(uuid, text) from public;
revoke all on function public.accept_ilchon_request(uuid, text) from public;
revoke all on function public.update_ilchon_display_name(uuid, text) from public;
revoke all on function public.get_ilchon_list(uuid) from public;

grant execute on function public.send_ilchon_request(uuid, text) to authenticated;
grant execute on function public.accept_ilchon_request(uuid, text) to authenticated;
grant execute on function public.update_ilchon_display_name(uuid, text) to authenticated;
grant execute on function public.get_ilchon_list(uuid) to authenticated;

notify pgrst, 'reload schema';
