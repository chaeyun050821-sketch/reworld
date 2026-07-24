-- 방문자 카운트 + 공용 게시판
-- Supabase SQL Editor에서 1회 실행

-- ── 다이어리 방문 (방문할 때마다 카운트, 본인 방문 제외) ──
create table if not exists public.diary_visits (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  visitor_id uuid not null references public.profiles (id) on delete cascade,
  visit_date date not null,
  created_at timestamptz not null default now(),
  constraint diary_visits_no_self check (host_id <> visitor_id)
);

create index if not exists diary_visits_host_date_idx
  on public.diary_visits (host_id, visit_date desc);

alter table public.diary_visits enable row level security;

drop policy if exists "diary_visits_select_host" on public.diary_visits;
create policy "diary_visits_select_host"
  on public.diary_visits for select to authenticated
  using (auth.uid() = host_id);

drop policy if exists "diary_visits_insert_visitor" on public.diary_visits;
create policy "diary_visits_insert_visitor"
  on public.diary_visits for insert to authenticated
  with check (auth.uid() = visitor_id and visitor_id <> host_id);

grant select, insert on public.diary_visits to authenticated;

-- ── 공용 게시판 ──
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_nickname text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint board_posts_content_len check (char_length(content) between 1 and 500)
);

create index if not exists board_posts_created_idx
  on public.board_posts (created_at desc);

create table if not exists public.board_likes (
  post_id uuid not null references public.board_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.board_posts enable row level security;
alter table public.board_likes enable row level security;

drop policy if exists "board_posts_select" on public.board_posts;
create policy "board_posts_select"
  on public.board_posts for select to authenticated using (true);

drop policy if exists "board_posts_insert_own" on public.board_posts;
create policy "board_posts_insert_own"
  on public.board_posts for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "board_likes_select" on public.board_likes;
create policy "board_likes_select"
  on public.board_likes for select to authenticated using (true);

drop policy if exists "board_likes_insert_own" on public.board_likes;
create policy "board_likes_insert_own"
  on public.board_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "board_likes_delete_own" on public.board_likes;
create policy "board_likes_delete_own"
  on public.board_likes for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert on public.board_posts to authenticated;
grant select, insert, delete on public.board_likes to authenticated;

-- ── 방문 기록 RPC (RLS 이슈 우회, 본인 방문 자동 제외) ──
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
