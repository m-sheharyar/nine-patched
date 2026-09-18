import { rgbaStr } from './color';
import { resolveNinePatch } from './geometry';
import { makeGradient } from './gradient';
import { clamp } from './math';
import { shapePath } from './shapes';
import type { NinePatchConfig, NinePatchContext } from './types';

/**
 * Draw the whole image: the shape inside the frame, then the black marker runs on the
 * frame itself (top/left = stretch, bottom/right = content). Sizing the surface to
 * imageWidth x imageHeight is the caller's job.
 */
export function renderNinePatch(ctx: NinePatchContext, config: NinePatchConfig): void {
  const { contentWidth: cw, contentHeight: ch, imageWidth, imageHeight, radius, stretch, content } = resolveNinePatch(config);
  ctx.clearRect(0, 0, imageWidth, imageHeight);

  const ox = 1;
  const oy = 1;

  const paint = (x: number, y: number, w: number, h: number): string | CanvasGradient =>
    config.fillType === 'gradient'
      ? makeGradient(ctx, x, y, w, h, config.gradientAngle, config.gradientStops)
      : rgbaStr(config.fillColor, config.fillOpacity);

  const bw = clamp(config.borderWidth, 0, Math.floor(Math.min(cw, ch) / 2));
  if (bw > 0) {
    const iw = cw - 2 * bw;
    const ih = ch - 2 * bw;
    // The border is a ring, so a translucent fill never picks up the border colour. The inner
    // shape is punched out and the fill added back with 'lighter' rather than drawn over the
    // hole: on a curved edge the two complementary coverages then sum to full alpha, where
    // source-over would leave a visible anti-aliasing seam.
    ctx.fillStyle = config.borderColor;
    shapePath(ctx, config.shape, ox, oy, cw, ch, radius);
    ctx.fill();
    shapePath(ctx, config.shape, ox + bw, oy + bw, iw, ih, Math.max(0, radius - bw));
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = paint(ox + bw, oy + bw, iw, ih);
    ctx.fill();
  } else {
    ctx.fillStyle = paint(ox, oy, cw, ch);
    shapePath(ctx, config.shape, ox, oy, cw, ch, radius);
    ctx.fill();
  }

  if (!config.bgTransparent) {
    // Painted last and underneath: drawn first, the ring's destination-out would erase it.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(ox, oy, cw, ch);
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#000000';
  if (config.stretchEnabled) {
    const sx = clamp(stretch.x, 0, cw);
    const sw = clamp(stretch.w, 0, cw - sx);
    const sy = clamp(stretch.y, 0, ch);
    const sh = clamp(stretch.h, 0, ch - sy);
    if (sw > 0) ctx.fillRect(ox + sx, 0, sw, 1);
    if (sh > 0) ctx.fillRect(0, oy + sy, 1, sh);
  }
  if (config.contentEnabled) {
    const cx = clamp(content.x, 0, cw);
    const cwid = clamp(content.w, 0, cw - cx);
    const cy = clamp(content.y, 0, ch);
    const cht = clamp(content.h, 0, ch - cy);
    if (cwid > 0) ctx.fillRect(ox + cx, imageHeight - 1, cwid, 1);
    if (cht > 0) ctx.fillRect(imageWidth - 1, oy + cy, 1, cht);
  }
}
