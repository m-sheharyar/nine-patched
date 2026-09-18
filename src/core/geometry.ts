import { clamp } from './math';
import type { NinePatchConfig, Region, Shape } from './types';

/** The radius actually used for the current shape (independent of the slider for pill/ellipse/rectangle). */
export function effectiveRadius(shape: Shape, w: number, h: number, cornerRadius: number) {
  const maxR = Math.floor(Math.min(w, h) / 2);
  if (shape === 'rectangle') return 0;
  if (shape === 'pill' || shape === 'ellipse') return maxR;
  return clamp(cornerRadius, 0, maxR);
}

/** A sensible default region: the flat middle, inset by the corner radius so corners aren't stretched. */
export function autoRegion(shape: Shape, w: number, h: number, cornerRadius: number): Region {
  const r = effectiveRadius(shape, w, h, cornerRadius);
  return { x: r, y: r, w: Math.max(0, w - 2 * r), h: Math.max(0, h - 2 * r) };
}

export interface ResolvedNinePatch {
  imageWidth: number;
  imageHeight: number;
  radius: number;
  maxRadius: number;
  stretch: Region;
  content: Region;
}

/** Turn a config into the concrete dimensions and regions the renderer and the UI both work from. */
export function resolveNinePatch(config: NinePatchConfig): ResolvedNinePatch {
  const { shape, contentWidth, contentHeight, cornerRadius } = config;
  const auto = autoRegion(shape, contentWidth, contentHeight, cornerRadius);
  return {
    imageWidth: contentWidth + 2, // content plus the 1px 9-patch frame on each side
    imageHeight: contentHeight + 2,
    radius: effectiveRadius(shape, contentWidth, contentHeight, cornerRadius),
    maxRadius: Math.floor(Math.min(contentWidth, contentHeight) / 2),
    stretch: config.stretchAuto ? auto : config.stretch,
    content: config.contentAuto ? auto : config.content,
  };
}
