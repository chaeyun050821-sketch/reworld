export function mapSupabaseError(message: string, code?: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("relation") &&
    (lower.includes("does not exist") || lower.includes("not found"))
  ) {
    return "DB 테이블이 없어요. Supabase SQL Editor에서 RUN-THIS-FOR-SYNC.sql을 실행해 주세요.";
  }

  if (lower.includes("permission denied") || lower.includes("row-level security") || code === "42501") {
    return "DB 권한(RLS) 문제예요. RUN-THIS-FOR-SYNC.sql을 다시 실행해 주세요.";
  }

  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "로그인이 필요해요. 다시 로그인해 주세요.";
  }

  if (
    lower.includes("bucket") ||
    lower.includes("storage") && lower.includes("not found")
  ) {
    return "사진 저장소가 없어요. Supabase SQL Editor에서 user-photos.sql을 실행해 주세요.";
  }

  if (lower.includes("user_photos")) {
    return "사진첩 테이블이 없어요. Supabase SQL Editor에서 user-photos.sql을 실행해 주세요.";
  }

  if (lower.includes("shop_listings")) {
    return "유저 상점 테이블이 없어요. Supabase SQL Editor에서 RUN-THIS-FOR-SYNC.sql(또는 shop-listings.sql)을 실행해 주세요.";
  }

  if (lower.includes("user_inventory")) {
    return "인벤토리 테이블이 없어요. Supabase SQL Editor에서 RUN-THIS-FOR-SYNC.sql(또는 user-inventory.sql)을 실행해 주세요.";
  }

  return message;
}

export type SyncResult = { ok: true } | { ok: false; error: string };
