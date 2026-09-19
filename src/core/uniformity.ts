import { clampRegion } from './math';
import type { Region } from './types';

/** RGBA rows of the content area (frame excluded). Structurally compatible with ImageData. */
export interface PixelGrid {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface StretchUniformity {
  horizontal: boolean;
  vertical: boolean;
}

/** Whether the two pixels at these grid indices count as the same colour. */
type PixelMatch = (a: number, b: number) => boolean;

/**
 * Pixel equality by index. The RGBA quad is compared as one 32-bit word through a DataView, which
 * unlike a Uint32Array view accepts any byteOffset, so a 2000 by 2000 grid stays around 15ms. Only
 * a mismatch pays for the alpha rule: fully transparent pixels match whatever colour data a
 * non-browser canvas left behind them.
 */
function pixelMatcher(data: Uint8ClampedArray, count: number): PixelMatch {
  const words = new DataView(data.buffer, data.byteOffset, count * 4);
  return (a, b) => words.getUint32(a * 4) === words.getUint32(b * 4) || (data[a * 4 + 3] === 0 && data[b * 4 + 3] === 0);
}

/** Every column of the run matches the run's first column, over the full height. */
function columnsUniform(same: PixelMatch, width: number, height: number, x: number, w: number): boolean {
  if (w <= 1) return true;
  for (let row = 0; row < height; row++) {
    const first = row * width + x;
    for (let column = 1; column < w; column++) {
      if (!same(first + column, first)) return false;
    }
  }
  return true;
}

/** Every row of the run matches the run's first row, over the full width. */
function rowsUniform(same: PixelMatch, width: number, y: number, h: number): boolean {
  if (h <= 1) return true;
  const first = y * width;
  for (let row = 1; row < h; row++) {
    const start = first + row * width;
    for (let column = 0; column < width; column++) {
      if (!same(start + column, first + column)) return false;
    }
  }
  return true;
}

/**
 * Whether the pixels along each stretch axis repeat exactly: every column of the x run equal over
 * the full height, every row of the y run equal over the full width. A run that fails looks uneven
 * once stretched.
 */
export function stretchUniformity(pixels: PixelGrid, stretch: Region): StretchUniformity {
  const width = Math.floor(pixels.width);
  const height = Math.floor(pixels.height);
  // A grid with no pixels, or with less data than it claims, has nothing to compare.
  if (!(width >= 1 && height >= 1 && pixels.data.length >= width * height * 4)) {
    return { horizontal: true, vertical: true };
  }
  const run = clampRegion(stretch, width, height);
  const same = pixelMatcher(pixels.data, width * height);
  return {
    horizontal: columnsUniform(same, width, height, Math.floor(run.x), Math.floor(run.w)),
    vertical: rowsUniform(same, width, Math.floor(run.y), Math.floor(run.h)),
  };
}
