import { clamp } from './math';
import type { NinePatchConfig, Region, Shape } from './types';

/** Upper bound for a content dimension, shared by the UI inputs and the coercion below. */
export const MAX_CONTENT_SIZE = 2000;

/** The radius actually used for the current shape (independent of the slider for pill/ellipse/rectangle). */
export function effectiveRadius(shape: Shape, w: number, h: number, cornerRadius: number) {
  const maxR = Math.floor(Math.min(w, h) / 2);
  if (shape === 'rectangle') return 0;
  if (shape === 'pill' || shape === 'ellipse') return maxR;
  return clamp(cornerRadius, 0, maxR);
}

/** A config can arrive from a URL or a CLI flag, so a dimension is forced into a renderable range. */
function contentDimension(value: number): number {
  return clamp(Math.floor(value), 1, MAX_CONTENT_SIZE);
}

interface AxisRun {
  start: number;
  length: number;
}

/** A 1-2px run in the middle of an axis, for an axis with no flat edge to stretch. */
function centreStrip(size: number): AxisRun {
  const n = Math.max(1, Math.floor(size));
  return { start: Math.floor((n - 1) / 2), length: n % 2 === 1 ? 1 : 2 };
}

function stretchAxis(size: number, radius: number, curved: boolean): AxisRun {
  const flat = size - 2 * radius;
  if (curved || flat < 1) return centreStrip(size);
  return { start: radius, length: flat };
}

function insetRegion(w: number, h: number, insetX: number, insetY: number): Region {
  return { x: insetX, y: insetY, w: Math.max(0, w - 2 * insetX), h: Math.max(0, h - 2 * insetY) };
}

/** Half the side of the square inscribed in an ellipse, measured in from the bounding box. */
const ellipseInset = (size: number) => Math.ceil((size / 2) * (1 - Math.SQRT1_2));

/**
 * The stretchable box: the flat span of each axis, inset by the corner radius. An axis with no
 * flat span (either axis of an ellipse, or one the radius consumes) falls back to a 1-2px centre
 * strip, so every shape still scales instead of losing its marker altogether.
 */
export function autoStretchRegion(shape: Shape, w: number, h: number, cornerRadius: number): Region {
  const r = effectiveRadius(shape, w, h, cornerRadius);
  const curved = shape === 'ellipse';
  const x = stretchAxis(w, r, curved);
  const y = stretchAxis(h, r, curved);
  return { x: x.start, y: y.start, w: x.length, h: y.length };
}

/** The content/padding box: the largest area inner text or icons can use without leaving the shape. */
export function autoContentRegion(shape: Shape, w: number, h: number, cornerRadius: number): Region {
  const r = effectiveRadius(shape, w, h, cornerRadius);
  // A square pill draws as a circle, so it takes the ellipse's inscribed rectangle too.
  if (shape === 'ellipse' || (shape === 'pill' && w === h)) return insetRegion(w, h, ellipseInset(w), ellipseInset(h));
  // A pill's radius spans its short axis entirely, so only the longer axis is inset by it.
  if (shape === 'pill') return insetRegion(w, h, w > h ? r : 0, h > w ? r : 0);
  return insetRegion(w, h, r, r);
}

export interface ResolvedNinePatch {
  contentWidth: number;
  contentHeight: number;
  imageWidth: number;
  imageHeight: number;
  radius: number;
  maxRadius: number;
  stretch: Region;
  content: Region;
}

/** Turn a config into the concrete dimensions and regions the renderer and the UI both work from. */
export function resolveNinePatch(config: NinePatchConfig): ResolvedNinePatch {
  const { shape, cornerRadius } = config;
  const contentWidth = contentDimension(config.contentWidth);
  const contentHeight = contentDimension(config.contentHeight);
  return {
    contentWidth,
    contentHeight,
    imageWidth: contentWidth + 2, // content plus the 1px 9-patch frame on each side
    imageHeight: contentHeight + 2,
    radius: effectiveRadius(shape, contentWidth, contentHeight, cornerRadius),
    maxRadius: Math.floor(Math.min(contentWidth, contentHeight) / 2),
    stretch: config.stretchAuto ? autoStretchRegion(shape, contentWidth, contentHeight, cornerRadius) : config.stretch,
    content: config.contentAuto ? autoContentRegion(shape, contentWidth, contentHeight, cornerRadius) : config.content,
  };
}
