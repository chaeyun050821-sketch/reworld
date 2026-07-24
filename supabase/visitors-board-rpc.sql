-- 이미 visitors-board.sql 을 실행한 경우, 이 파일만 추가 실행하세요.
-- (방문 기록 RPC — RLS 이슈 해결)

create or replace function public.record_diary_visit(p_host_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visitor uuid := auth.uid();
begin
  if v_visitor is null or v_visitor = p_host_id then
    return;
  end if;

  insert into public.diary_visits (host_id, visitor_id, visit_date)
  values (p_host_id, v_visitor, (timezone('Asia/Seoul', now()))::date);
end;
$$;

revoke all on function public.record_diary_visit(uuid) from public;
grant execute on function public.record_diary_visit(uuid) to authenticated;

create or replace function public.get_visitor_stats(p_host_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_today_count bigint;
  v_total_count bigint;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;

  select count(*) into v_today_count
  from public.diary_visits
  where host_id = p_host_id and visit_date = v_today;

  select count(*) into v_total_count
  from public.diary_visits
  where host_id = p_host_id;

  return json_build_object(
    'today', v_today_count,
    'total', v_total_count,
    'dateKey', v_today::text
  );
end;
$$;

revoke all on function public.get_visitor_stats(uuid) from public;
grant execute on function public.get_visitor_stats(uuid) to authenticated;
