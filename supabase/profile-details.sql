-- 프로필 상세(상태, 해시태그, 필드, BGM) 저장
-- Supabase SQL Editor에서 실행

alter table public.profiles
  add column if not exists status text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists fields jsonb not null default '[]'::jsonb,
  add column if not exists bgm_title text,
  add column if not exists bgm_preview_url text,
  add column if not exists diary_theme_id text;
