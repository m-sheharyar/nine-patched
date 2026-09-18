import { rgbaStr } from './color';
import { clamp } from './math';
import type { GradientStop, NinePatchContext } from './types';

type GradientContext = Pick<NinePatchContext, 'createLinearGradient'>;

export interface GradientLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * The line a linear gradient runs along inside a box, using the CSS angle convention
 * (0deg = to top, 90deg = to right), so values can be copied straight from Figma/CSS.
 */
export function gradientLine(x: number, y: number, w: number, h: number, angleDeg: number): GradientLine {
  const a = (angleDeg * Math.PI) / 180;
  const dirX = Math.sin(a);
  const dirY = -Math.cos(a);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return {
    x0: cx - (dirX * len) / 2,
    y0: cy - (dirY * len) / 2,
    x1: cx + (dirX * len) / 2,
    y1: cy + (dirY * len) / 2,
  };
}

export function sortedStops(stops: GradientStop[]): GradientStop[] {
  return [...stops].sort((p, q) => p.position - q.position);
}

export function makeGradient(
  ctx: GradientContext,
  x: number,
  y: number,
  w: number,
  h: number,
  angleDeg: number,
  stops: GradientStop[],
): CanvasGradient {
  const { x0, y0, x1, y1 } = gradientLine(x, y, w, h, angleDeg);
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const s of sortedStops(stops)) {
    g.addColorStop(clamp(s.position / 100, 0, 1), rgbaStr(s.color, s.opacity));
  }
  return g;
}

export function cssGradient(angle: number, stops: GradientStop[]) {
  const parts = sortedStops(stops).map((s) => `${rgbaStr(s.color, s.opacity)} ${clamp(s.position, 0, 100)}%`);
  return `linear-gradient(${angle}deg, ${parts.join(', ')})`;
}
