export type PhotoDecoration =
  | {
      id: string;
      type: "emoticon";
      emoticonId: number;
      x: number;
      y: number;
    }
  | {
      id: string;
      type: "text";
      text: string;
      color: string;
      size: number;
      x: number;
      y: number;
    }
  | {
      id: string;
      type: "avatar";
      size: number;
      x: number;
      y: number;
    }
  | {
      id: string;
      type: "item";
      itemId: string;
      label: string;
      imageSrc?: string;
      color?: string;
      icon?: string;
      size: number;
      x: number;
      y: number;
    };

export type PhotoDecorationMap = Record<string, PhotoDecoration[]>;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizePhotoDecoration(raw: unknown): PhotoDecoration | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : null;
  const type = row.type;
  if (!id || typeof type !== "string") return null;

  const x = clamp(asFiniteNumber(row.x, 50), 5, 95);
  const y = clamp(asFiniteNumber(row.y, 50), 5, 95);

  if (type === "emoticon") {
    const emoticonId = asFiniteNumber(row.emoticonId, NaN);
    if (!Number.isFinite(emoticonId)) return null;
    return { id, type: "emoticon", emoticonId, x, y };
  }

  if (type === "text") {
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) return null;
    return {
      id,
      type: "text",
      text,
      color: typeof row.color === "string" && row.color.trim() ? row.color.trim() : "#5b4b2d",
      size: clamp(asFiniteNumber(row.size, 1), 0.55, 3),
      x,
      y,
    };
  }

  if (type === "avatar") {
    return {
      id,
      type: "avatar",
      size: clamp(asFiniteNumber(row.size, 1), 0.4, 2.8),
      x,
      y,
    };
  }

  if (type === "item") {
    const itemId = typeof row.itemId === "string" && row.itemId.trim() ? row.itemId.trim() : null;
    if (!itemId) return null;
    return {
      id,
      type: "item",
      itemId,
      label: typeof row.label === "string" && row.label.trim() ? row.label.trim() : "아이템",
      imageSrc: typeof row.imageSrc === "string" && row.imageSrc.trim() ? row.imageSrc.trim() : undefined,
      color: typeof row.color === "string" ? row.color : undefined,
      icon: typeof row.icon === "string" ? row.icon : undefined,
      size: clamp(asFiniteNumber(row.size, 1), 0.4, 2.8),
      x,
      y,
    };
  }

  return null;
}

export function normalizePhotoDecorations(raw: unknown): PhotoDecoration[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizePhotoDecoration)
    .filter((item): item is PhotoDecoration => !!item);
}

export function createDecorationId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
