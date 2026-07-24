import type { StoredPhoto } from "./photo-storage";
import { mapSupabaseError, type SyncResult } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

type PhotoRow = {
  id: string;
  user_id: string;
  kind: string;
  src_value: string;
  storage_path: string | null;
  created_at: string;
};

const MAX_IMAGE_EDGE = 1280;
const JPEG_QUALITY = 0.82;
const MAX_DATA_URL_CHARS = 900_000;

function rowToPhoto(row: PhotoRow): StoredPhoto {
  return {
    id: row.id,
    src: row.src_value,
    kind: row.kind === "gradient" ? "gradient" : "upload",
    createdAt: row.created_at,
  };
}

export async function fetchUserPhotos(userId: string): Promise<StoredPhoto[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("user_photos")
    .select("id, user_id, kind, src_value, storage_path, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[photos] fetch failed:", error.message, error.code);
    return [];
  }
  if (!data) return [];
  return (data as PhotoRow[]).map(rowToPhoto);
}

async function fileToJpegBlob(file: File): Promise<Blob> {
  if (typeof createImageBitmap === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), "image/jpeg", JPEG_QUALITY);
  });
  return blob ?? file;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(blob);
  });
}

async function uploadToStorage(userId: string, photoId: string, blob: Blob): Promise<{ path: string; publicUrl: string } | null> {
  const path = `${userId}/${photoId}.jpg`;
  const { error } = await supabase.storage.from("user-photos").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) {
    console.error("[photos] storage upload failed:", error.message);
    return null;
  }
  const { data } = supabase.storage.from("user-photos").getPublicUrl(path);
  if (!data?.publicUrl) return null;
  return { path, publicUrl: data.publicUrl };
}

export async function addUploadedPhoto(
  userId: string,
  file: File,
): Promise<{ ok: true; photo: StoredPhoto } | { ok: false; error: string }> {
  const photoId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const jpegBlob = await fileToJpegBlob(file);

    if (isSupabaseConfigured()) {
      const uploaded = await uploadToStorage(userId, photoId, jpegBlob);
      if (uploaded) {
        const { error } = await supabase.from("user_photos").insert({
          id: photoId,
          user_id: userId,
          kind: "upload",
          src_value: uploaded.publicUrl,
          storage_path: uploaded.path,
          created_at: createdAt,
          updated_at: createdAt,
        });
        if (error) {
          return { ok: false, error: mapSupabaseError(error.message, error.code) };
        }
        return {
          ok: true,
          photo: {
            id: photoId,
            src: uploaded.publicUrl,
            kind: "upload",
            createdAt,
          },
        };
      }

      // Fallback: store data URL in DB when storage bucket is missing
      const dataUrl = await blobToDataUrl(jpegBlob);
      if (dataUrl.length > MAX_DATA_URL_CHARS) {
        return {
          ok: false,
          error: "사진이 너무 커요. Supabase에서 user-photos.sql(스토리지 포함)을 실행해 주세요.",
        };
      }
      const { error } = await supabase.from("user_photos").insert({
        id: photoId,
        user_id: userId,
        kind: "upload",
        src_value: dataUrl,
        storage_path: null,
        created_at: createdAt,
        updated_at: createdAt,
      });
      if (error) {
        return { ok: false, error: mapSupabaseError(error.message, error.code) };
      }
      return {
        ok: true,
        photo: { id: photoId, src: dataUrl, kind: "upload", createdAt },
      };
    }

    const dataUrl = await blobToDataUrl(jpegBlob);
    return {
      ok: true,
      photo: { id: photoId, src: dataUrl, kind: "upload", createdAt },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "사진 업로드에 실패했어요.",
    };
  }
}

export async function addGradientPhoto(
  userId: string,
  gradient: string,
  existingId?: string,
): Promise<{ ok: true; photo: StoredPhoto } | { ok: false; error: string }> {
  const photoId = existingId ?? crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const photo: StoredPhoto = {
    id: photoId,
    src: gradient,
    kind: "gradient",
    createdAt,
  };

  if (!isSupabaseConfigured()) {
    return { ok: true, photo };
  }

  const { error } = await supabase.from("user_photos").upsert(
    {
      id: photoId,
      user_id: userId,
      kind: "gradient",
      src_value: gradient,
      storage_path: null,
      created_at: createdAt,
      updated_at: createdAt,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true, photo };
}

export async function upsertLocalPhoto(
  userId: string,
  photo: StoredPhoto,
): Promise<SyncResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const { error } = await supabase.from("user_photos").upsert(
    {
      id: photo.id,
      user_id: userId,
      kind: photo.kind,
      src_value: photo.src,
      storage_path: photo.kind === "upload" && !photo.src.startsWith("data:")
        ? `${userId}/${photo.id}.jpg`
        : null,
      created_at: photo.createdAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export async function deleteUserPhoto(userId: string, photo: StoredPhoto): Promise<SyncResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const { error } = await supabase
    .from("user_photos")
    .delete()
    .eq("id", photo.id)
    .eq("user_id", userId);

  if (error) {
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }

  if (photo.kind === "upload" && !photo.src.startsWith("data:")) {
    const path = `${userId}/${photo.id}.jpg`;
    await supabase.storage.from("user-photos").remove([path]);
  }

  return { ok: true };
}

export function mergePhotoLists(local: StoredPhoto[], remote: StoredPhoto[]): StoredPhoto[] {
  const byId = new Map<string, StoredPhoto>();
  for (const photo of remote) byId.set(photo.id, photo);
  for (const photo of local) {
    if (!byId.has(photo.id)) byId.set(photo.id, photo);
  }
  return Array.from(byId.values()).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}
