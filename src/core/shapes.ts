import { clamp } from './math';
import type { NinePatchContext, Shape } from './types';

type PathContext = Pick<NinePatchContext, 'beginPath' | 'closePath' | 'moveTo' | 'lineTo' | 'arcTo' | 'ellipse'>;

export function roundedRectPath(ctx: PathContext, x: number, y: number, w: number, h: number, r: number) {
  r = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function shapePath(ctx: PathContext, shape: Shape, x: number, y: number, w: number, h: number, r: number) {
  if (w <= 0 || h <= 0) {
    ctx.beginPath();
    return;
  }
  if (shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
  } else {
    roundedRectPath(ctx, x, y, w, h, r);
  }
}
