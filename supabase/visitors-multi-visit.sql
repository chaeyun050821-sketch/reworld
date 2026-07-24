-- 방문자 수: 1일 1회 제한 해제 → 방문할 때마다 카운트
-- Supabase SQL Editor에서 1회 실행

alter table public.diary_visits
  drop constraint if exists diary_visits_unique_daily;

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
