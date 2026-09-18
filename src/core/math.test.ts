import { describe, expect, it } from 'vitest';
import { clamp, clampRegion } from './math';

describe('clamp', () => {
  it.each([
    ['inside range', 5, 0, 10, 5],
    ['below min', -5, 0, 10, 0],
    ['above max', 15, 0, 10, 10],
    ['at min boundary', 0, 0, 10, 0],
    ['at max boundary', 10, 0, 10, 10],
    // Non-finite input falls back to `min` rather than being clamped toward `max`.
    ['NaN falls back to min', NaN, 2, 10, 2],
    ['+Infinity falls back to min', Infinity, 2, 10, 2],
    ['-Infinity falls back to min', -Infinity, 2, 10, 2],
  ])('%s: clamp(%p, %p, %p) === %p', (_name, v, min, max, expected) => {
    expect(clamp(v, min, max)).toBe(expected);
  });
});

describe('clampRegion', () => {
  it('shrinks w/h so the region fits inside the box', () => {
    expect(clampRegion({ x: 5, y: 5, w: 100, h: 100 }, 20, 20)).toEqual({ x: 5, y: 5, w: 15, h: 15 });
  });

  it('clamps x/y beyond the box and zeroes the remaining w/h', () => {
    expect(clampRegion({ x: 50, y: 60, w: 10, h: 10 }, 20, 20)).toEqual({ x: 20, y: 20, w: 0, h: 0 });
  });

  it('leaves an already-fitting region untouched', () => {
    expect(clampRegion({ x: 2, y: 3, w: 4, h: 5 }, 20, 20)).toEqual({ x: 2, y: 3, w: 4, h: 5 });
  });
});
