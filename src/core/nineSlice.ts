import { clamp, clampRegion } from './math';
import type { Region } from './types';

export interface Size {
  width: number;
  height: number;
}

/** One drawImage call: a source rect and a destination rect, both in content space (frame excluded). */
export interface SliceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** The slice of a 2D context the 9-slice draw uses, generic over the image so a non-browser canvas fits. */
export interface NineSliceContext<Image> {
  imageSmoothingEnabled: boolean;
  drawImage(
    image: Image,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

/** A length can arrive from a URL, a CLI flag or a drag, so it is floored into a drawable range. */
const axisLength = (value: number) => clamp(Math.floor(value), 1, Number.MAX_SAFE_INTEGER);

/** A region from the same untrusted sources: inside the source, and whole, so no rect can be fractional. */
function coerceRegion(region: Region, width: number, height: number): Region {
  const r = clampRegion(region, width, height);
  return { x: Math.floor(r.x), y: Math.floor(r.y), w: Math.floor(r.w), h: Math.floor(r.h) };
}

/** One axis of the split: a source span mapped onto a destination span. */
interface AxisSegment {
  src: number;
  srcLen: number;
  dest: number;
  destLen: number;
}

interface AxisRun {
  start: number;
  length: number;
}

/** A segment with nothing to read, or nowhere to put it, would draw nothing. */
const drawable = (segments: AxisSegment[]) => segments.filter((s) => s.srcLen > 0 && s.destLen > 0);

/**
 * Split one axis: the parts outside the run keep their pixel size and the run absorbs the
 * difference. Below the fixed size the run is dropped and the fixed parts shrink in proportion,
 * which keeps the function total for the CLI (the UI never asks for a target that small).
 */
function axisSegments(len: number, run: AxisRun | null, target: number): AxisSegment[] {
  if (!run || run.length <= 0) return [{ src: 0, srcLen: len, dest: 0, destLen: target }];
  const lead = run.start;
  const trailSrc = run.start + run.length;
  const trail = len - trailSrc;
  const fixed = lead + trail;
  if (target < fixed) {
    const leadDest = Math.round((target * lead) / fixed);
    return drawable([
      { src: 0, srcLen: lead, dest: 0, destLen: leadDest },
      { src: trailSrc, srcLen: trail, dest: leadDest, destLen: target - leadDest },
    ]);
  }
  return drawable([
    { src: 0, srcLen: lead, dest: 0, destLen: lead },
    { src: run.start, srcLen: run.length, dest: lead, destLen: target - fixed },
    { src: trailSrc, srcLen: trail, dest: target - trail, destLen: trail },
  ]);
}

/** Split the source into up to nine rects that tile the target: fixed parts keep their size, the stretch run takes the rest. */
export function nineSliceRects(source: Size, stretch: Region | null, target: Size): SliceRect[] {
  const width = axisLength(source.width);
  const height = axisLength(source.height);
  const run = stretch ? coerceRegion(stretch, width, height) : null;
  const columns = axisSegments(width, run && { start: run.x, length: run.w }, axisLength(target.width));
  const rows = axisSegments(height, run && { start: run.y, length: run.h }, axisLength(target.height));

  const rects: SliceRect[] = [];
  for (const row of rows) {
    for (const column of columns) {
      rects.push({
        sx: column.src,
        sy: row.src,
        sw: column.srcLen,
        sh: row.srcLen,
        dx: column.dest,
        dy: row.dest,
        dw: column.destLen,
        dh: row.destLen,
      });
    }
  }
  return rects;
}

/** The content box of the stretched image: the source paddings stay fixed while the box grows. */
export function stretchedContentBox(source: Size, content: Region, target: Size): Region {
  const width = axisLength(source.width);
  const height = axisLength(source.height);
  const box = coerceRegion(content, width, height);
  const right = Math.max(0, width - box.x - box.w);
  const bottom = Math.max(0, height - box.y - box.h);
  return {
    x: box.x,
    y: box.y,
    w: Math.max(0, axisLength(target.width) - box.x - right),
    h: Math.max(0, axisLength(target.height) - box.y - bottom),
  };
}

/** Draw the rects from an image that still carries its 9-patch frame. Sizing the surface is the caller's job. */
export function drawNineSlice<Image>(ctx: NineSliceContext<Image>, image: Image, rects: SliceRect[], frame = 1): void {
  ctx.imageSmoothingEnabled = true;
  for (const r of rects) {
    ctx.drawImage(image, r.sx + frame, r.sy + frame, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
  }
}
