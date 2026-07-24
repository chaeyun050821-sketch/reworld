-- 알림 읽음 시각 (계정 간 동기화)
-- Supabase SQL Editor에서 1회 실행

alter table public.profiles
  add column if not exists notification_last_read_at timestamptz;
