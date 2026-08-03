-- 네잎클로버 보상 기록 (출석·일기·방명록 등) — coins와 함께 user_inventory에 저장
-- Supabase SQL Editor에서 실행

alter table public.user_inventory
  add column if not exists clover_rewards jsonb not null default '{}'::jsonb;
