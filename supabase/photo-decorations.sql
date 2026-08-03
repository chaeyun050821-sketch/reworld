-- 사진첩 꾸미기(아바타/아이템/이모티콘/텍스트) 저장
-- Supabase SQL Editor에서 실행

alter table public.user_photos
  add column if not exists decorations jsonb not null default '[]'::jsonb;

comment on column public.user_photos.decorations is
  'Photo album decorations: emoticon | text | avatar | item overlays';
