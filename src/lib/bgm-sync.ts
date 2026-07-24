import { mapSupabaseError } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

const BGM_BUCKET = "user-photos";

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.-]/g, "_").slice(0, 80);
}

/** 프로필 BGM MP3를 Supabase Storage에 올리고 공개 URL을 반환합니다. */
export async function uploadProfileBgm(
  userId: string,
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const path = `${userId}/bgm/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BGM_BUCKET).upload(path, file, {
    contentType: file.type || "audio/mpeg",
    upsert: true,
  });

  if (error) {
    console.error("[bgm] upload failed:", error.message);
    return { ok: false, error: mapSupabaseError(error.message) };
  }

  const { data } = supabase.storage.from(BGM_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { ok: false, error: "BGM URL을 만들지 못했어요." };
  }

  return { ok: true, publicUrl: data.publicUrl };
}
