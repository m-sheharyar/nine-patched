import { clamp, MAX_CONTENT_SIZE } from '@/core';
import type { Size } from '@/core';

/** Upper bound for a preview dimension: twice the largest source the app can produce. */
export const MAX_PREVIEW_SIZE = 2 * MAX_CONTENT_SIZE;

/** Automatic target: wide enough to show the horizontal run working, tall enough for the vertical one. */
const AUTO_WIDTH = 3;
const AUTO_HEIGHT = 2;

const STEP = 1;
const SHIFT_STEP = 10;

/** Which axis an arrow grows, from a handle sitting at the bottom right corner. A Map, so that a
 *  key name shared with `Object.prototype` ("toString") cannot resolve to an inherited member. */
const ARROWS = new Map<string, Size>([
  ['ArrowLeft', { width: -1, height: 0 }],
  ['ArrowRight', { width: 1, height: 0 }],
  ['ArrowUp', { width: 0, height: -1 }],
  ['ArrowDown', { width: 0, height: 1 }],
]);

/** A source dimension can arrive from a URL or from a field mid-edit, so it is forced into the drawable range. */
const sourceAxis = (value: number) => clamp(Math.floor(value), 1, MAX_CONTENT_SIZE);

/** The target shown until the user picks one: three times the content width, twice its height. */
export function automaticTarget(source: Size): Size {
  return { width: sourceAxis(source.width) * AUTO_WIDTH, height: sourceAxis(source.height) * AUTO_HEIGHT };
}

/**
 * The drawable target: never below the source, because a 9-patch has no documented behaviour when
 * the target is smaller than its fixed parts, and never past the preview limit. Callers clamp at
 * read time and keep the value the user stored, so shrinking the artwork and growing it back does
 * not lose their target.
 */
export function clampTarget(target: Size, source: Size): Size {
  return {
    width: clamp(Math.round(target.width), sourceAxis(source.width), MAX_PREVIEW_SIZE),
    height: clamp(Math.round(target.height), sourceAxis(source.height), MAX_PREVIEW_SIZE),
  };
}

/** The size actually drawn: the stored target when there is one, otherwise the automatic size. */
export function resolveTarget(stored: Size | null, source: Size): Size {
  return clampTarget(stored ?? automaticTarget(source), source);
}

/** A drag: the pointer moves in CSS pixels, the artwork in target pixels. */
export function dragTarget(base: Size, dx: number, dy: number, scale: number, source: Size): Size {
  const z = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return clampTarget({ width: base.width + dx / z, height: base.height + dy / z }, source);
}

/** An arrow key nudge, ten pixels with Shift. Null for every other key, which the handle then leaves alone. */
export function nudgeTarget(base: Size, key: string, shift: boolean, source: Size): Size | null {
  const arrow = ARROWS.get(key);
  if (!arrow) return null;
  const step = shift ? SHIFT_STEP : STEP;
  return clampTarget({ width: base.width + arrow.width * step, height: base.height + arrow.height * step }, source);
}
