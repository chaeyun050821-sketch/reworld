-- 사용자별 일촌명(별명) 저장
-- supabase/ilchon-wave.sql 실행 후 SQL Editor에서 1회 실행

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

-- 신청자가 상대를 부를 일촌명 저장. 기존 신청 RPC를 감싸 기존 검증을 그대로 사용한다.
create or replace function public.send_ilchon_request(target_user_id uuid, target_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  normalized text := regexp_replace(trim(coalesce(target_display_name, '')), E'[\\n\\r\\t]+', ' ', 'g');
  result jsonb;
begin
  if char_length(normalized) < 1 or char_length(normalized) > 12 then
    return jsonb_build_object('ok', false, 'error', '일촌명은 1~12자로 입력해 주세요.');
  end if;

  result := public.send_ilchon_request(target_user_id);
  if coalesce((result->>'ok')::boolean, false) then
    update public.ilchon_requests
      set requester_alias = normalized, updated_at = now()
      where from_user_id = me and to_user_id = target_user_id and status = 'pending';
  end if;
  return result || jsonb_build_object('requester_alias', normalized);
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
  requester_default text;
  result jsonb;
begin
  if char_length(normalized) < 1 or char_length(normalized) > 12 then
    return jsonb_build_object('ok', false, 'error', '일촌명은 1~12자로 입력해 주세요.');
  end if;
  select * into req from public.ilchon_requests where id = request_id;
  if req.id is null or req.to_user_id <> me then
    return jsonb_build_object('ok', false, 'error', '수락할 일촌 신청을 찾지 못했어요.');
  end if;

  result := public.accept_ilchon_request(request_id);
  if not coalesce((result->>'ok')::boolean, false) then return result; end if;

  select nickname into requester_default from public.profiles where id = req.to_user_id;
  update public.ilchons
    set display_name = normalized
    where user_id = req.to_user_id and ilchon_id = req.from_user_id;
  update public.ilchons
    set display_name = coalesce(nullif(trim(req.requester_alias), ''), requester_default)
    where user_id = req.from_user_id and ilchon_id = req.to_user_id;

  return result || jsonb_build_object('display_name', normalized);
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

grant execute on function public.send_ilchon_request(uuid, text) to authenticated;
grant execute on function public.accept_ilchon_request(uuid, text) to authenticated;
grant execute on function public.update_ilchon_display_name(uuid, text) to authenticated;
