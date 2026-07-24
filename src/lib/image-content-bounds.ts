export type HandMadeItemContentBounds = {
  /** Left edge of opaque content, 0–1 of natural width */
  x: number;
  /** Top edge of opaque content, 0–1 of natural height */
  y: number;
  /** Opaque content width, 0–1 of natural width */
  w: number;
  /** Opaque content height, 0–1 of natural height */
  h: number;
};

export const FULL_IMAGE_CONTENT_BOUNDS: HandMadeItemContentBounds = {
  x: 0,
  y: 0,
  w: 1,
  h: 1,
};

const boundsCache = new Map<string, HandMadeItemContentBounds>();

function cacheKey(src: string): string {
  return src.length > 256 ? `${src.slice(0, 128)}…${src.length}…${src.slice(-64)}` : src;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function isFullImageContentBounds(bounds: HandMadeItemContentBounds | null | undefined): boolean {
  if (!bounds) return true;
  return bounds.w >= 0.98 && bounds.h >= 0.98 && bounds.x <= 0.01 && bounds.y <= 0.01;
}

export function measureImageContentBounds(src: string): Promise<HandMadeItemContentBounds> {
  const cached = boundsCache.get(cacheKey(src));
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        if (canvas.width === 0 || canvas.height === 0) {
          resolve(FULL_IMAGE_CONTENT_BOUNDS);
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(FULL_IMAGE_CONTENT_BOUNDS);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 12) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve(FULL_IMAGE_CONTENT_BOUNDS);
          return;
        }

        const bounds: HandMadeItemContentBounds = {
          x: clamp01(minX / width),
          y: clamp01(minY / height),
          w: clamp01((maxX - minX + 1) / width),
          h: clamp01((maxY - minY + 1) / height),
        };
        boundsCache.set(cacheKey(src), bounds);
        resolve(bounds);
      } catch {
        resolve(FULL_IMAGE_CONTENT_BOUNDS);
      }
    };
    img.onerror = () => resolve(FULL_IMAGE_CONTENT_BOUNDS);
    img.src = src;
  });
}
