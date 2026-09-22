import { FULL_IMAGE_CONTENT_BOUNDS, type HandMadeItemContentBounds } from "../lib/shop-storage";

export type ItemPixelTool = "paint" | "erase" | "eyedropper";
export type ItemPixelSnapshot = { size: number; pixels: Array<string | null> };

// A fixed source grid keeps item pixels and the editor background in sync.
export const ITEM_PIXEL_GRID_SIZE = 32;

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
