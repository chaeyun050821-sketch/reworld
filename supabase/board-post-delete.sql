-- 게시글 작성자 본인 삭제 허용
-- Supabase SQL Editor에서 1회 실행

drop policy if exists "board_posts_delete_own" on public.board_posts;
create policy "board_posts_delete_own"
  on public.board_posts for delete to authenticated
  using (auth.uid() = author_id);

grant delete on public.board_posts to authenticated;
