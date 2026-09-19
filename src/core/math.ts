import type { Region } from './types';

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

export function clampRegion(r: Region, w: number, h: number): Region {
  const x = clamp(r.x, 0, w);
  const y = clamp(r.y, 0, h);
  return { x, y, w: clamp(r.w, 0, w - x), h: clamp(r.h, 0, h - y) };
}
