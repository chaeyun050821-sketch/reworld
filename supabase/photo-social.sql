-- 사진첩 조회수 · 하트 · 댓글 · 이모티콘 공감
-- Supabase Dashboard → SQL Editor → 전체 붙여넣기 → Run (여러 번 실행해도 안전)

alter table public.user_photos
  add column if not exists view_count integer not null default 0;

create table if not exists public.photo_likes (
  photo_id uuid not null references public.user_photos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create index if not exists photo_likes_photo_id_idx
  on public.photo_likes (photo_id);

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.user_photos (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_nickname text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint photo_comments_content_len check (char_length(content) between 1 and 300)
);

create index if not exists photo_comments_photo_id_idx
  on public.photo_comments (photo_id, created_at asc);

create table if not exists public.photo_reactions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.user_photos (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  actor_name text not null,
  emoticon_id integer not null,
  created_at timestamptz not null default now()
);

create index if not exists photo_reactions_photo_id_idx
  on public.photo_reactions (photo_id, created_at asc);

grant select, insert, delete on public.photo_likes to authenticated;
grant select, insert, delete on public.photo_comments to authenticated;
grant select, insert, delete on public.photo_reactions to authenticated;

alter table public.photo_likes enable row level security;
alter table public.photo_comments enable row level security;
alter table public.photo_reactions enable row level security;

drop policy if exists "photo_likes_select" on public.photo_likes;
create policy "photo_likes_select"
  on public.photo_likes for select to authenticated using (true);

drop policy if exists "photo_likes_insert_own" on public.photo_likes;
create policy "photo_likes_insert_own"
  on public.photo_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "photo_likes_delete_own" on public.photo_likes;
create policy "photo_likes_delete_own"
  on public.photo_likes for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "photo_comments_select" on public.photo_comments;
create policy "photo_comments_select"
  on public.photo_comments for select to authenticated using (true);

drop policy if exists "photo_comments_insert_own" on public.photo_comments;
create policy "photo_comments_insert_own"
  on public.photo_comments for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "photo_comments_delete_own" on public.photo_comments;
create policy "photo_comments_delete_own"
  on public.photo_comments for delete to authenticated
  using (auth.uid() = author_id);

drop policy if exists "photo_reactions_select" on public.photo_reactions;
create policy "photo_reactions_select"
  on public.photo_reactions for select to authenticated using (true);

drop policy if exists "photo_reactions_insert_own" on public.photo_reactions;
create policy "photo_reactions_insert_own"
  on public.photo_reactions for insert to authenticated
  with check (auth.uid() = actor_id);

drop policy if exists "photo_reactions_delete_own" on public.photo_reactions;
create policy "photo_reactions_delete_own"
  on public.photo_reactions for delete to authenticated
  using (auth.uid() = actor_id);

create or replace function public.increment_photo_view(p_photo_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.user_photos
  set view_count = view_count + 1,
      updated_at = now()
  where id = p_photo_id
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_photo_view(uuid) to authenticated;

create or replace function public.add_photo_comment(
  p_photo_id uuid,
  p_content text,
  p_author_nickname text
)
returns table (
  id uuid,
  photo_id uuid,
  author_id uuid,
  author_nickname text,
  content text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nick text := coalesce(nullif(trim(p_author_nickname), ''), '익명');
  body text := trim(p_content);
begin
  if uid is null then
    raise exception '로그인이 필요해요.';
  end if;
  if body is null or char_length(body) < 1 then
    raise exception '내용을 입력해 주세요.';
  end if;
  if char_length(body) > 300 then
    raise exception '댓글은 300자 이내로 작성해 주세요.';
  end if;
  if not exists (select 1 from public.user_photos up where up.id = p_photo_id) then
    raise exception '이 사진이 클라우드에 없어 댓글을 저장할 수 없어요.';
  end if;

  return query
  insert into public.photo_comments (photo_id, author_id, author_nickname, content)
  values (p_photo_id, uid, nick, body)
  returning
    public.photo_comments.id,
    public.photo_comments.photo_id,
    public.photo_comments.author_id,
    public.photo_comments.author_nickname,
    public.photo_comments.content,
    public.photo_comments.created_at;
end;
$$;

grant execute on function public.add_photo_comment(uuid, text, text) to authenticated;

-- 알림 트리거가 실패해도 댓글/좋아요 저장은 유지
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
  if to_regclass('public.user_notifications') is null
     or to_regprocedure('public._insert_user_notification(uuid, text, uuid, text, text, text, uuid, uuid, text)') is null then
    return NEW;
  end if;

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
exception
  when others then
    raise warning 'photo like notify failed: %', SQLERRM;
    return NEW;
end;
$$;

drop trigger if exists notify_photo_like on public.photo_likes;
create trigger notify_photo_like
  after insert on public.photo_likes
  for each row execute function public.trg_notify_photo_like();

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
  if to_regclass('public.user_notifications') is null
     or to_regprocedure('public._insert_user_notification(uuid, text, uuid, text, text, text, uuid, uuid, text)') is null then
    return NEW;
  end if;

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
exception
  when others then
    raise warning 'photo comment notify failed: %', SQLERRM;
    return NEW;
end;
$$;

drop trigger if exists notify_photo_comment on public.photo_comments;
create trigger notify_photo_comment
  after insert on public.photo_comments
  for each row execute function public.trg_notify_photo_comment();

do $$
begin
  alter publication supabase_realtime add table public.photo_comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when others then
    raise notice 'Realtime publication skip: %', sqlerrm;
end $$;
