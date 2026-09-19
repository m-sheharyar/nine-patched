import { describe, expect, it } from 'vitest';
import type { PixelGrid, StretchUniformity } from './uniformity';
import { stretchUniformity } from './uniformity';
import type { Region } from './types';

type Rgba = [number, number, number, number];

const BASE: Record<string, Rgba> = {
  '.': [0, 0, 0, 0],
  a: [10, 20, 30, 255],
  b: [90, 80, 70, 255],
  c: [5, 200, 15, 255],
  d: [250, 3, 130, 255],
};

/** One letter per colour, one string per row. `extra` overrides a letter for a case that needs an exact channel. */
const grid = (rows: string[], extra: Record<string, Rgba> = {}): PixelGrid => {
  const palette = { ...BASE, ...extra };
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const rgba = palette[ch];
      if (!rgba) throw new Error(`unknown colour ${ch}`);
      data.set(rgba, (y * width + x) * 4);
    });
  });
  return { width, height: rows.length, data };
};

const RUN: Region = { x: 1, y: 1, w: 2, h: 2 };
const PAIR: Region = { x: 0, y: 0, w: 2, h: 2 };

it('row 13: a grid of one colour is uniform on both axes', () => {
  expect(stretchUniformity(grid(['aaaa', 'aaaa', 'aaaa', 'aaaa']), RUN)).toEqual({ horizontal: true, vertical: true });
});

it('row 14: columns that differ inside the x run fail only the horizontal check', () => {
  expect(stretchUniformity(grid(['abab', 'abab', 'abab', 'abab']), RUN)).toEqual({ horizontal: false, vertical: true });
});

it('row 15: rows that differ inside the y run fail only the vertical check', () => {
  expect(stretchUniformity(grid(['aaaa', 'bbbb', 'aaaa', 'bbbb']), RUN)).toEqual({ horizontal: true, vertical: false });
});

it('row 16: columns that differ outside the x run are ignored', () => {
  const pixels = grid(['abccba', 'abccba', 'abccba', 'abccba']);
  expect(stretchUniformity(pixels, { x: 2, y: 1, w: 2, h: 2 })).toEqual({ horizontal: true, vertical: true });
});

it('row 17: a corner band outside the y run still breaks the horizontal check', () => {
  expect(stretchUniformity(grid(['abca', 'aaaa', 'aaaa', 'aaaa']), RUN).horizontal).toBe(false);
});

describe('row 18: a difference at the end of a loop is not missed', () => {
  it.each<[string, string[], Region]>([
    ['last column of the run', ['aaab', 'aaab', 'aaab', 'aaab'], { x: 1, y: 0, w: 3, h: 4 }],
    ['last row of the grid', ['aaaa', 'aaaa', 'aaaa', 'abaa'], { x: 1, y: 0, w: 2, h: 2 }],
  ])('%s', (_name, rows, stretch) => {
    expect(stretchUniformity(grid(rows), stretch).horizontal).toBe(false);
  });
});

describe('row 19: a difference in a single channel breaks the check', () => {
  it.each<[string, Rgba]>([
    ['red', [11, 20, 30, 40]],
    ['green', [10, 21, 30, 40]],
    ['blue', [10, 20, 31, 40]],
    ['alpha', [10, 20, 30, 41]],
  ])('%s only', (_name, variant) => {
    const pixels = grid(['az', 'az'], { a: [10, 20, 30, 40], z: variant });
    expect(stretchUniformity(pixels, PAIR).horizontal).toBe(false);
  });
});

describe('row 20: fully transparent pixels compare by alpha alone', () => {
  it.each<[string, Rgba, Rgba, boolean]>([
    ['two alpha 0 pixels with different rgb are equal', [10, 20, 30, 0], [200, 150, 100, 0], true],
    ['alpha 0 against alpha 1 with the same rgb is not equal', [10, 20, 30, 0], [10, 20, 30, 1], false],
  ])('%s', (_name, a, z, expected) => {
    expect(stretchUniformity(grid(['az', 'az'], { a, z }), PAIR).horizontal).toBe(expected);
  });
});

describe('row 21: degenerate input neither throws nor alarms', () => {
  const VARIED = ['abcd', 'bcda', 'cdab', 'dabc'];
  const BOTH: StretchUniformity = { horizontal: true, vertical: true };
  it.each<[string, PixelGrid, Region, StretchUniformity]>([
    ['a 1px run over a fully varied grid', grid(VARIED), { x: 1, y: 1, w: 1, h: 1 }, BOTH],
    ['an empty run', grid(VARIED), { x: 0, y: 0, w: 0, h: 0 }, BOTH],
    ['a run partly outside is checked on the part inside', grid(['aaab', 'aaab', 'aaab', 'aaab']), { x: 2, y: 0, w: 10, h: 2 }, { horizontal: false, vertical: true }],
    ['a run partly outside never reads past the row end', grid(['baa', 'baa', 'baa']), { x: 1, y: 0, w: 10, h: 1 }, BOTH],
    ['an empty grid', grid([]), { x: 0, y: 0, w: 2, h: 2 }, BOTH],
    ['data shorter than the grid', { width: 4, height: 4, data: new Uint8ClampedArray(8) }, { x: 0, y: 0, w: 4, h: 4 }, BOTH],
  ])('%s', (_name, pixels, stretch, expected) => {
    expect(stretchUniformity(pixels, stretch)).toEqual(expected);
  });
});
