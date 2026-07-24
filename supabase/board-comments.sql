-- 게시판 댓글
-- Supabase SQL Editor에서 1회 실행

create table if not exists public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_nickname text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint board_comments_content_len check (char_length(content) between 1 and 300)
);

create index if not exists board_comments_post_id_idx
  on public.board_comments (post_id, created_at asc);

alter table public.board_comments enable row level security;

drop policy if exists "board_comments_select" on public.board_comments;
create policy "board_comments_select"
  on public.board_comments for select to authenticated using (true);

drop policy if exists "board_comments_insert_own" on public.board_comments;
create policy "board_comments_insert_own"
  on public.board_comments for insert to authenticated
  with check (auth.uid() = author_id);

grant select, insert on public.board_comments to authenticated;
