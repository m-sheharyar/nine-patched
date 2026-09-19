export const MIN_ZOOM = 1;
export const MAX_ZOOM = 32;
/** Below the desktop layout the stage opens at this level rather than Fit, which lands too large on a phone. */
export const SMALL_SCREEN_ZOOM = 2;

/**
 * The zoom ladder the +/- buttons walk. Every step is an integer so the canvas keeps landing on
 * whole device pixels and `image-rendering: pixelated` stays honest.
 */
export const ZOOM_STEPS: readonly number[] = [1, 2, 3, 4, 5, 6, 8, 12, 16, 24, 32];

/**
 * Share of the stage the artwork may occupy at Fit. Well under 1, so the image reads as an object
 * with margin around its 1px frame rather than as a wall of fill. Manual zoom ignores it.
 */
export const FIT_FRACTION = 0.6;

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

/** The largest ladder rung at which the image still stays within FIT_FRACTION of the stage. */
export function fitScale(stageWidth: number, stageHeight: number, imageWidth: number, imageHeight: number): number {
  if (![stageWidth, stageHeight, imageWidth, imageHeight].every((n) => Number.isFinite(n) && n > 0)) {
    return MIN_ZOOM;
  }
  const limit = Math.min((stageWidth * FIT_FRACTION) / imageWidth, (stageHeight * FIT_FRACTION) / imageHeight);
  const rung = [...ZOOM_STEPS].reverse().find((step) => step <= limit);
  return rung ?? MIN_ZOOM;
}

/**
 * The next rung of the ladder past `current`. `current` can sit between rungs (it often comes from
 * `fitScale`), so this picks the nearest rung strictly beyond it rather than an index offset.
 */
export function nextZoom(current: number, direction: 1 | -1): number {
  const from = clampZoom(current);
  if (direction === 1) {
    const up = ZOOM_STEPS.find((step) => step > from);
    return up ?? MAX_ZOOM;
  }
  const down = [...ZOOM_STEPS].reverse().find((step) => step < from);
  return down ?? MIN_ZOOM;
}

/** `4×` — the zoom readout, kept in one place so the button title and the label never drift. */
export function formatZoom(zoom: number): string {
  return `${zoom}×`;
}
