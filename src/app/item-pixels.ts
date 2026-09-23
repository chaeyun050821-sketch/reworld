import { FULL_IMAGE_CONTENT_BOUNDS, type HandMadeItemContentBounds } from "../lib/shop-storage";

export type ItemPixelTool = "paint" | "erase" | "eyedropper";
export type ItemPixelSnapshot = { size: number; pixels: Array<string | null> };

// A fixed source grid keeps item pixels and the editor background in sync.
export const ITEM_PIXEL_GRID_SIZE = 32;

/**
 * Convert the underlying pixel-art grid to a different resolution while keeping
 * the rendered item footprint unchanged. Upscaling duplicates source cells;
 * downscaling selects the dominant source color for each destination cell.
 */
export function resampleItemPixelGrid(
  pixels: Array<string | null>,
  sourceSize: number,
  targetSize: number,
): Array<string | null> {
  if (sourceSize <= 0 || targetSize <= 0) return [];
  if (sourceSize === targetSize) return [...pixels];

  const sourceAt = (x: number, y: number) => pixels[y * sourceSize + x] ?? null;

  // Each larger grid cell is a direct subdivision of one source cell, so this
  // keeps hard pixel-art edges rather than introducing interpolated colors.
  if (targetSize > sourceSize) {
    return Array.from({ length: targetSize * targetSize }, (_, index) => {
      const x = index % targetSize;
      const y = Math.floor(index / targetSize);
      return sourceAt(
        Math.min(sourceSize - 1, Math.floor((x * sourceSize) / targetSize)),
        Math.min(sourceSize - 1, Math.floor((y * sourceSize) / targetSize)),
      );
    });
  }

  return Array.from({ length: targetSize * targetSize }, (_, index) => {
    const targetX = index % targetSize;
    const targetY = Math.floor(index / targetSize);
    const startX = (targetX * sourceSize) / targetSize;
    const endX = ((targetX + 1) * sourceSize) / targetSize;
    const startY = (targetY * sourceSize) / targetSize;
    const endY = ((targetY + 1) * sourceSize) / targetSize;
    const weights = new Map<string, number>();

    for (let y = Math.floor(startY); y < Math.ceil(endY); y += 1) {
      if (y < 0 || y >= sourceSize) continue;
      const overlapY = Math.max(0, Math.min(endY, y + 1) - Math.max(startY, y));
      for (let x = Math.floor(startX); x < Math.ceil(endX); x += 1) {
        if (x < 0 || x >= sourceSize) continue;
        const overlapX = Math.max(0, Math.min(endX, x + 1) - Math.max(startX, x));
        const color = sourceAt(x, y) ?? "__transparent__";
        weights.set(color, (weights.get(color) ?? 0) + overlapX * overlapY);
      }
    }

    let dominantColor = "__transparent__";
    let dominantWeight = -1;
    for (const [color, weight] of weights) {
      if (weight > dominantWeight) {
        dominantColor = color;
        dominantWeight = weight;
      }
    }
    return dominantColor === "__transparent__" ? null : dominantColor;
  });
}

export function itemPixelColor(red: number, green: number, blue: number, alpha: number): string | null {
  if (alpha < 20) return null;
  const hex = (value: number) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  const rgb = `#${hex(red)}${hex(green)}${hex(blue)}`;
  return alpha >= 250 ? rgb : `${rgb}${hex(alpha)}`;
}

export function itemPixelRgba(color: string): [number, number, number, number] {
  const value = color.replace("#", "");
  if (value.length !== 6 && value.length !== 8) return [0, 0, 0, 255];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) : 255,
  ];
}

export function itemPixelsFromContext(context: CanvasRenderingContext2D, size: number): Array<string | null> {
  const data = context.getImageData(0, 0, size, size).data;
  return Array.from({ length: size * size }, (_, index) => {
    const offset = index * 4;
    return itemPixelColor(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
  });
}

export function itemPixelsToDataUrl(pixels: Array<string | null>, size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(size, size);
  pixels.forEach((color, index) => {
    if (!color) return;
    const [red, green, blue, alpha] = itemPixelRgba(color);
    const offset = index * 4;
    image.data[offset] = red;
    image.data[offset + 1] = green;
    image.data[offset + 2] = blue;
    image.data[offset + 3] = alpha;
  });
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export function itemPixelContentBounds(pixels: Array<string | null>, size: number): HandMadeItemContentBounds {
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;
  pixels.forEach((color, index) => {
    if (!color) return;
    const x = index % size;
    const y = Math.floor(index / size);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  if (maxX < minX || maxY < minY) return FULL_IMAGE_CONTENT_BOUNDS;
  return { x: minX / size, y: minY / size, w: (maxX - minX + 1) / size, h: (maxY - minY + 1) / size };
}

export function loadItemPixelGrid(src: string, size: number): Promise<Array<string | null>> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return reject(new Error("canvas unavailable"));
      context.imageSmoothingEnabled = false;
      const ratio = Math.min(size / Math.max(1, image.naturalWidth), size / Math.max(1, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      context.drawImage(image, Math.floor((size - width) / 2), Math.floor((size - height) / 2), width, height);
      resolve(itemPixelsFromContext(context, size));
    };
    image.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    image.src = src;
  });
}
