import { describe, expect, it } from 'vitest';
import type { Size } from '@/core';
import {
  automaticTarget,
  clampTarget,
  dragTarget,
  MAX_PREVIEW_SIZE,
  nudgeTarget,
  resolveTarget,
} from './previewTarget';

const SOURCE: Size = { width: 80, height: 80 };

describe('automaticTarget', () => {
  it('is three times the content width and twice its height', () => {
    expect(automaticTarget({ width: 80, height: 48 })).toEqual({ width: 240, height: 96 });
  });

  it('coerces a source that never came from a rendered artwork', () => {
    const cases: [Size, Size][] = [
      [{ width: 80.9, height: 48.9 }, { width: 240, height: 96 }],
      [{ width: 0, height: -5 }, { width: 3, height: 2 }],
      [{ width: Number.NaN, height: Number.POSITIVE_INFINITY }, { width: 3, height: 2 }],
      [{ width: 5000, height: 5000 }, { width: 6000, height: 4000 }],
    ];
    for (const [source, expected] of cases) {
      expect(automaticTarget(source)).toEqual(expected);
    }
  });
});

describe('clampTarget', () => {
  it('leaves a target that is inside the range alone', () => {
    expect(clampTarget({ width: 240, height: 160 }, SOURCE)).toEqual({ width: 240, height: 160 });
  });

  it('holds the target between the source size and the preview limit', () => {
    const cases: [Size, Size][] = [
      [{ width: 10, height: 10 }, { width: 80, height: 80 }],
      [{ width: 80, height: 79 }, { width: 80, height: 80 }],
      [{ width: 9000, height: MAX_PREVIEW_SIZE + 1 }, { width: MAX_PREVIEW_SIZE, height: MAX_PREVIEW_SIZE }],
      [{ width: Number.NaN, height: Number.POSITIVE_INFINITY }, { width: 80, height: 80 }],
    ];
    for (const [target, expected] of cases) {
      expect(clampTarget(target, SOURCE)).toEqual(expected);
    }
  });

  it('only returns whole pixels', () => {
    expect(clampTarget({ width: 240.4, height: 242.5 }, SOURCE)).toEqual({ width: 240, height: 243 });
  });

  it('applies the same source coercion as the automatic size', () => {
    expect(clampTarget({ width: 1, height: 1 }, { width: 5000, height: 0 })).toEqual({ width: 2000, height: 1 });
  });
});

describe('resolveTarget', () => {
  it('falls back to the automatic size while nothing is stored', () => {
    expect(resolveTarget(null, SOURCE)).toEqual({ width: 240, height: 160 });
  });

  it('clamps the automatic size for a source that would overshoot the limit', () => {
    expect(resolveTarget(null, { width: 2000, height: 2000 })).toEqual({
      width: MAX_PREVIEW_SIZE,
      height: MAX_PREVIEW_SIZE,
    });
  });

  it('clamps a stored target without rewriting it', () => {
    const stored: Size = { width: 300, height: 20 };
    expect(resolveTarget(stored, SOURCE)).toEqual({ width: 300, height: 80 });
    expect(stored).toEqual({ width: 300, height: 20 });
    expect(resolveTarget(stored, { width: 10, height: 10 })).toEqual({ width: 300, height: 20 });
  });
});

describe('dragTarget', () => {
  it('moves the artwork by the pointer delta divided by the scale', () => {
    const base: Size = { width: 240, height: 160 };
    const cases: [number, number, number, Size][] = [
      [40, 20, 1, { width: 280, height: 180 }],
      [40, 20, 2, { width: 260, height: 170 }],
      [40, 20, 4, { width: 250, height: 165 }],
      [-40, -20, 2, { width: 220, height: 150 }],
      [5, 5, 2, { width: 243, height: 163 }],
    ];
    for (const [dx, dy, scale, expected] of cases) {
      expect(dragTarget(base, dx, dy, scale, SOURCE)).toEqual(expected);
    }
  });

  it('stops at the source size and at the preview limit', () => {
    expect(dragTarget({ width: 240, height: 160 }, -900, -900, 1, SOURCE)).toEqual({ width: 80, height: 80 });
    expect(dragTarget({ width: 240, height: 160 }, 9000, 9000, 1, SOURCE)).toEqual({
      width: MAX_PREVIEW_SIZE,
      height: MAX_PREVIEW_SIZE,
    });
  });

  it('treats a scale that cannot divide as 1', () => {
    for (const scale of [0, -2, Number.NaN]) {
      expect(dragTarget({ width: 240, height: 160 }, 40, 20, scale, SOURCE)).toEqual({ width: 280, height: 180 });
    }
  });
});

describe('nudgeTarget', () => {
  const base: Size = { width: 240, height: 160 };

  it('moves one pixel per arrow, ten with Shift', () => {
    const cases: [string, boolean, Size][] = [
      ['ArrowRight', false, { width: 241, height: 160 }],
      ['ArrowLeft', false, { width: 239, height: 160 }],
      ['ArrowDown', false, { width: 240, height: 161 }],
      ['ArrowUp', false, { width: 240, height: 159 }],
      ['ArrowRight', true, { width: 250, height: 160 }],
      ['ArrowLeft', true, { width: 230, height: 160 }],
      ['ArrowDown', true, { width: 240, height: 170 }],
      ['ArrowUp', true, { width: 240, height: 150 }],
    ];
    for (const [key, shift, expected] of cases) {
      expect(nudgeTarget(base, key, shift, SOURCE)).toEqual(expected);
    }
  });

  it('ignores every other key', () => {
    for (const key of ['Enter', ' ', 'Tab', 'a', 'arrowright', 'toString']) {
      expect(nudgeTarget(base, key, false, SOURCE)).toBeNull();
    }
  });

  it('stays inside the range at both ends', () => {
    expect(nudgeTarget({ width: 80, height: 80 }, 'ArrowLeft', true, SOURCE)).toEqual({ width: 80, height: 80 });
    expect(nudgeTarget({ width: MAX_PREVIEW_SIZE, height: 80 }, 'ArrowRight', true, SOURCE)).toEqual({
      width: MAX_PREVIEW_SIZE,
      height: 80,
    });
  });
});
