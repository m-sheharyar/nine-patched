import { clamp, type Region } from '@/core';

/** Width of every guide stroke. Guides are lines only: nothing is painted over artwork pixels. */
export const GUIDE_STROKE = 1;

export interface GuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuideBand {
  /** The region's own first pixel, in CSS px from the canvas corner. Anchors the label. */
  edge: number;
  /** Stroke centre of the line hugging the OUTSIDE of the region's start edge. */
  before: number;
  /** Stroke centre of the line hugging the OUTSIDE of the region's end edge. */
  after: number;
}

export interface GuideGeometry {
  /** Size of the scaled artwork, so the overlay can be laid out without re-deriving it. */
  width: number;
  height: number;
  /** Stretchable columns, marked by two full-height lines outside the band. */
  stretchColumn: GuideBand | null;
  /** Stretchable rows, marked by two full-width lines outside the band. */
  stretchRow: GuideBand | null;
  /** Stroke-centre rect for a stroke drawn fully INSIDE the content/padding region. */
  content: GuideRect | null;
}

export interface GuideInput {
  contentWidth: number;
  contentHeight: number;
  stretch: Region;
  content: Region;
  stretchEnabled: boolean;
  contentEnabled: boolean;
  scale: number;
}

interface MarkerRun {
  start: number;
  length: number;
}

/** Same clamping the renderer applies before painting a marker run, so the two always agree. */
function markerRun(start: number, length: number, size: number): MarkerRun {
  const s = clamp(start, 0, size);
  return { start: s, length: clamp(length, 0, size - s) };
}

const half = GUIDE_STROKE / 2;

/**
 * Stretch and content regions often resolve to the same rectangle, so the two guides are pushed to
 * opposite sides of the boundary they share: stretch lines sit just outside, the content box just
 * inside. They end up adjacent instead of one hiding the other, and neither covers its own region.
 */
function band(run: MarkerRun, scale: number): GuideBand {
  const edge = (1 + run.start) * scale;
  return { edge, before: edge - half, after: edge + run.length * scale + half };
}

/**
 * Where to draw the guides over the scaled canvas, in CSS pixels relative to the canvas's top-left
 * corner. The 1px 9-patch frame is included, so artwork pixel `n` starts at `(n + 1) * scale`.
 */
export function guideGeometry(input: GuideInput): GuideGeometry {
  const { contentWidth: cw, contentHeight: ch, scale: z } = input;
  const width = (cw + 2) * z;
  const height = (ch + 2) * z;

  const sx = markerRun(input.stretch.x, input.stretch.w, cw);
  const sy = markerRun(input.stretch.y, input.stretch.h, ch);
  const cx = markerRun(input.content.x, input.content.w, cw);
  const cy = markerRun(input.content.y, input.content.h, ch);

  const stretchColumn = input.stretchEnabled && sx.length > 0 ? band(sx, z) : null;
  const stretchRow = input.stretchEnabled && sy.length > 0 ? band(sy, z) : null;
  const content =
    input.contentEnabled && (cx.length > 0 || cy.length > 0)
      ? {
          x: (1 + cx.start) * z + half,
          y: (1 + cy.start) * z + half,
          width: Math.max(0, cx.length * z - GUIDE_STROKE),
          height: Math.max(0, cy.length * z - GUIDE_STROKE),
        }
      : null;

  return { width, height, stretchColumn, stretchRow, content };
}
