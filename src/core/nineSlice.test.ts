import { describe, expect, it } from 'vitest';
import {
  drawNineSlice,
  nineSliceRects,
  stretchedContentBox,
  type NineSliceContext,
  type SliceRect,
  type Size,
} from './nineSlice';
import type { Region } from './types';

const SRC: Size = { width: 10, height: 8 };
/** lead 2 / run 4 / trail 4 on x, lead 3 / run 2 / trail 3 on y. */
const RUN: Region = { x: 2, y: 3, w: 4, h: 2 };
const size = (width: number, height: number): Size => ({ width, height });

/** Paint every destination pixel into a counter: an exact tiling leaves every cell at 1, an escapee adds a -1. */
const tiles = (rects: SliceRect[], target: Size): Set<number> => {
  const counts: number[] = new Array(target.width * target.height).fill(0);
  for (const r of rects) {
    for (let y = r.dy; y < r.dy + r.dh; y += 1) {
      for (let x = r.dx; x < r.dx + r.dw; x += 1) {
        if (x >= 0 && y >= 0 && x < target.width && y < target.height) counts[y * target.width + x] += 1;
        else counts.push(-1);
      }
    }
  }
  return new Set(counts);
};
const EXACT = new Set([1]);
const badValues = (r: object): number[] => Object.values(r).filter((v: number) => !Number.isInteger(v) || v < 0);

it('row 1: splits a 10 by 8 source onto a 30 by 20 target as nine rects, rows first', () => {
  expect(nineSliceRects(SRC, RUN, size(30, 20))).toEqual([
    { sx: 0, sy: 0, sw: 2, sh: 3, dx: 0, dy: 0, dw: 2, dh: 3 },
    { sx: 2, sy: 0, sw: 4, sh: 3, dx: 2, dy: 0, dw: 24, dh: 3 },
    { sx: 6, sy: 0, sw: 4, sh: 3, dx: 26, dy: 0, dw: 4, dh: 3 },
    { sx: 0, sy: 3, sw: 2, sh: 2, dx: 0, dy: 3, dw: 2, dh: 14 },
    { sx: 2, sy: 3, sw: 4, sh: 2, dx: 2, dy: 3, dw: 24, dh: 14 },
    { sx: 6, sy: 3, sw: 4, sh: 2, dx: 26, dy: 3, dw: 4, dh: 14 },
    { sx: 0, sy: 5, sw: 2, sh: 3, dx: 0, dy: 17, dw: 2, dh: 3 },
    { sx: 2, sy: 5, sw: 4, sh: 3, dx: 2, dy: 17, dw: 24, dh: 3 },
    { sx: 6, sy: 5, sw: 4, sh: 3, dx: 26, dy: 17, dw: 4, dh: 3 },
  ]);
});

describe('row 2: destination rects tile the target with no gap and no overlap', () => {
  it.each<[number, number]>([
    [10, 8],
    [30, 20],
    [6, 6],
    [12, 9],
    [100, 64],
  ])('target %i by %i', (w, h) => {
    expect(tiles(nineSliceRects(SRC, RUN, size(w, h)), size(w, h))).toEqual(EXACT);
  });
});

it('row 3: fixed parts are never scaled', () => {
  const rects = nineSliceRects(SRC, RUN, size(30, 20));
  for (const i of [0, 2, 6, 8]) expect([rects[i].dw, rects[i].dh]).toEqual([rects[i].sw, rects[i].sh]);
  for (const i of [1, 7]) expect(rects[i].dh).toBe(rects[i].sh);
  for (const i of [3, 5]) expect(rects[i].dw).toBe(rects[i].sw);
});

describe('row 4: an axis without a run scales as a whole', () => {
  it.each<[string, Region | null, SliceRect[]]>([
    [
      'null stretch is one rect, source onto target',
      null,
      [{ sx: 0, sy: 0, sw: 10, sh: 8, dx: 0, dy: 0, dw: 30, dh: 20 }],
    ],
    [
      'w 0 is three rects in one column',
      { x: 2, y: 3, w: 0, h: 2 },
      [
        { sx: 0, sy: 0, sw: 10, sh: 3, dx: 0, dy: 0, dw: 30, dh: 3 },
        { sx: 0, sy: 3, sw: 10, sh: 2, dx: 0, dy: 3, dw: 30, dh: 14 },
        { sx: 0, sy: 5, sw: 10, sh: 3, dx: 0, dy: 17, dw: 30, dh: 3 },
      ],
    ],
    [
      'h 0 is three rects in one row',
      { x: 2, y: 3, w: 4, h: 0 },
      [
        { sx: 0, sy: 0, sw: 2, sh: 8, dx: 0, dy: 0, dw: 2, dh: 20 },
        { sx: 2, sy: 0, sw: 4, sh: 8, dx: 2, dy: 0, dw: 24, dh: 20 },
        { sx: 6, sy: 0, sw: 4, sh: 8, dx: 26, dy: 0, dw: 4, dh: 20 },
      ],
    ],
  ])('%s', (_name, stretch, expected) => {
    expect(nineSliceRects(SRC, stretch, size(30, 20))).toEqual(expected);
  });
});

it('row 5: a run over the whole source is one rect and emits no zero sized fixed part', () => {
  const rects = nineSliceRects(SRC, { x: 0, y: 0, w: 10, h: 8 }, size(30, 20));
  expect(rects).toEqual([{ sx: 0, sy: 0, sw: 10, sh: 8, dx: 0, dy: 0, dw: 30, dh: 20 }]);
  expect(rects.filter((r) => r.sw === 0 || r.sh === 0 || r.dw === 0 || r.dh === 0)).toEqual([]);
});

it('row 6: a target width equal to the fixed parts gives two columns, no zero width middle', () => {
  const rects = nineSliceRects(SRC, RUN, size(6, 20));
  expect(rects).toHaveLength(6);
  expect([...new Set(rects.map((r) => r.dx))]).toEqual([0, 2]);
});

it('row 7: a target under the fixed size drops the middle and shrinks lead and trail proportionally', () => {
  const rects = nineSliceRects(SRC, { x: 4, y: 0, w: 2, h: 0 }, size(5, 8));
  expect(rects).toEqual([
    { sx: 0, sy: 0, sw: 4, sh: 8, dx: 0, dy: 0, dw: 3, dh: 8 },
    { sx: 6, sy: 0, sw: 4, sh: 8, dx: 3, dy: 0, dw: 2, dh: 8 },
  ]);
  expect(tiles(rects, size(5, 8))).toEqual(EXACT);
});

it('row 8: a lead of 0 under the fixed size is not emitted and the trail takes the whole target', () => {
  const rects = nineSliceRects(SRC, { x: 0, y: 0, w: 2, h: 0 }, size(5, 8));
  expect(rects).toEqual([{ sx: 2, sy: 0, sw: 8, sh: 8, dx: 0, dy: 0, dw: 5, dh: 8 }]);
});

describe('row 9: hostile input is coerced, never fractional and never negative', () => {
  it.each<[string, Region, Size, Size]>([
    ['target NaN counts as 1', RUN, size(NaN, NaN), size(1, 1)],
    ['target 0 counts as 1', RUN, size(0, 0), size(1, 1)],
    ['target -5 counts as 1', RUN, size(-5, -5), size(1, 1)],
    ['target 7.9 is floored to 7', RUN, size(7.9, 7.9), size(7, 7)],
    ['negative region', { x: -3, y: -2, w: 4, h: 3 }, size(30, 20), size(30, 20)],
    ['oversize region', { x: 2, y: 1, w: 99, h: 99 }, size(30, 20), size(30, 20)],
    ['fractional region', { x: 2.7, y: 1.2, w: 4.4, h: 2.9 }, size(30, 20), size(30, 20)],
    ['NaN region', { x: NaN, y: NaN, w: NaN, h: NaN }, size(30, 20), size(30, 20)],
  ])('%s', (_name, stretch, target, coerced) => {
    const rects = nineSliceRects(SRC, stretch, target);
    expect(rects.flatMap(badValues)).toEqual([]);
    expect(tiles(rects, coerced)).toEqual(EXACT);
  });
});

it('row 10: the content box keeps the paddings and grows only the middle', () => {
  expect(stretchedContentBox(SRC, { x: 2, y: 1, w: 5, h: 4 }, size(30, 20))).toEqual({ x: 2, y: 1, w: 25, h: 16 });
});

describe('row 11: the content box never reports a negative padding or size', () => {
  it.each<[string, Region, Size]>([
    ['target smaller than the paddings', { x: 4, y: 3, w: 2, h: 2 }, size(1, 1)],
    ['content outside the source', { x: 20, y: 20, w: 5, h: 5 }, size(30, 20)],
    ['negative content', { x: -4, y: -4, w: 5, h: 5 }, size(30, 20)],
    ['content larger than the source', { x: 0, y: 0, w: 99, h: 99 }, size(30, 20)],
    ['fractional content', { x: 1.7, y: 0.4, w: 4.2, h: 3.3 }, size(30, 20)],
  ])('%s', (_name, content, target) => {
    expect(Object.values(stretchedContentBox(SRC, content, target)).filter((v: number) => v < 0)).toEqual([]);
  });
});

describe('row 12: drawNineSlice offsets the source by the frame and draws smoothed', () => {
  const RECTS: SliceRect[] = [
    { sx: 0, sy: 0, sw: 2, sh: 3, dx: 0, dy: 0, dw: 2, dh: 3 },
    { sx: 6, sy: 5, sw: 4, sh: 3, dx: 26, dy: 17, dw: 4, dh: 3 },
  ];

  /** A recording fake of the NineSliceContext interface, with smoothing captured per call. */
  const recorder = () => {
    const calls: Array<{ image: string; args: number[]; smoothing: boolean }> = [];
    let smoothing = false;
    const ctx: NineSliceContext<string> = {
      get imageSmoothingEnabled() {
        return smoothing;
      },
      set imageSmoothingEnabled(value: boolean) {
        smoothing = value;
      },
      drawImage: (image, ...args) => calls.push({ image, args, smoothing }),
    };
    return { ctx, calls };
  };

  it.each<[string, number | undefined, number[][]]>([
    [
      'the default frame adds 1 to sx and sy only',
      undefined,
      [
        [1, 1, 2, 3, 0, 0, 2, 3],
        [7, 6, 4, 3, 26, 17, 4, 3],
      ],
    ],
    [
      'frame 0 adds nothing',
      0,
      [
        [0, 0, 2, 3, 0, 0, 2, 3],
        [6, 5, 4, 3, 26, 17, 4, 3],
      ],
    ],
  ])('%s', (_name, frame, expected) => {
    const { ctx, calls } = recorder();
    if (frame === undefined) drawNineSlice(ctx, 'image', RECTS);
    else drawNineSlice(ctx, 'image', RECTS, frame);
    expect(calls.map((c) => c.args)).toEqual(expected);
    expect(calls.map((c) => c.image)).toEqual(['image', 'image']);
    expect(calls[0].smoothing).toBe(true);
  });
});
