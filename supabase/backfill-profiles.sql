-- 기존 auth 유저 → profiles 백필 (친구 닉네임 검색용, 1회 실행)
-- Supabase SQL Editor에서 실행하세요.

insert into public.profiles (id, nickname)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'nickname'), ''), split_part(u.email, '@', 1))
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- profiles는 있는데 닉네임이 메타데이터와 다른 경우 동기화 (선택)
-- update public.profiles p
-- set nickname = coalesce(nullif(trim(u.raw_user_meta_data->>'nickname'), ''), p.nickname),
--     updated_at = now()
-- from auth.users u
-- where p.id = u.id
--   and nullif(trim(u.raw_user_meta_data->>'nickname'), '') is not null
--   and lower(p.nickname) <> lower(trim(u.raw_user_meta_data->>'nickname'));
