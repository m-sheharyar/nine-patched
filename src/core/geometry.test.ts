import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './defaults';
import { autoContentRegion, autoStretchRegion, effectiveRadius, MAX_CONTENT_SIZE, resolveNinePatch } from './geometry';
import type { NinePatchConfig, Shape } from './types';

const cfg = (overrides: Partial<NinePatchConfig>): NinePatchConfig => ({ ...DEFAULT_CONFIG, ...overrides });

describe('effectiveRadius', () => {
  it.each([
    ['rectangle ignores cornerRadius entirely', 'rectangle' as Shape, 100, 50, 30, 0],
    ['pill uses half the smaller dimension, ignoring cornerRadius', 'pill' as Shape, 80, 40, 5, 20],
    ['ellipse uses half the smaller dimension, ignoring cornerRadius', 'ellipse' as Shape, 100, 50, 5, 25],
    ['rounded uses cornerRadius when within bounds', 'rounded' as Shape, 100, 50, 10, 10],
    ['rounded clamps a radius larger than half the size', 'rounded' as Shape, 40, 40, 100, 20],
    ['rounded with odd sizes clamps via floor', 'rounded' as Shape, 15, 9, 100, 4],
    ['pill with odd smaller dimension floors the max radius', 'pill' as Shape, 15, 9, 0, 4],
  ])('%s: effectiveRadius(%p, %p, %p, %p) === %p', (_name, shape, w, h, r, expected) => {
    expect(effectiveRadius(shape, w, h, r)).toBe(expected);
  });
});

describe('autoStretchRegion', () => {
  it('rounded: insets by the corner radius on every side', () => {
    expect(autoStretchRegion('rounded', 80, 80, 12)).toEqual({ x: 12, y: 12, w: 56, h: 56 });
  });

  it('rectangle: the auto region is the full box (no radius to inset by)', () => {
    expect(autoStretchRegion('rectangle', 100, 50, 10)).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it('pill: an odd smaller dimension still leaves a real flat sliver to stretch', () => {
    expect(autoStretchRegion('pill', 80, 41, 0)).toEqual({ x: 20, y: 20, w: 40, h: 1 });
  });

  it('pill: an even smaller dimension falls back to a 2px centre strip on that axis', () => {
    expect(autoStretchRegion('pill', 80, 40, 0)).toEqual({ x: 20, y: 19, w: 40, h: 2 });
  });

  it('tall pill: the centre strip lands on the narrow axis', () => {
    expect(autoStretchRegion('pill', 40, 80, 0)).toEqual({ x: 19, y: 20, w: 2, h: 40 });
  });

  it('ellipse: both axes use a centre strip, because neither has a flat edge', () => {
    expect(autoStretchRegion('ellipse', 41, 80, 0)).toEqual({ x: 20, y: 39, w: 1, h: 2 });
  });

  it('ellipse: an even size gives a 2px strip centred within 1px', () => {
    expect(autoStretchRegion('ellipse', 100, 50, 0)).toEqual({ x: 49, y: 24, w: 2, h: 2 });
  });

  it('circle: equal sides still get markers on both axes', () => {
    expect(autoStretchRegion('ellipse', 80, 80, 0)).toEqual({ x: 39, y: 39, w: 2, h: 2 });
  });

  it('1px sizes still produce a 1px marker on each axis', () => {
    expect(autoStretchRegion('ellipse', 1, 1, 0)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(autoStretchRegion('rounded', 1, 1, 5)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it.each(['rounded', 'pill', 'ellipse', 'rectangle'] as const)(
    '%s: never leaves an axis without a marker, at any size',
    (shape) => {
      for (let size = 1; size <= 40; size++) {
        const region = autoStretchRegion(shape, size, size + 1, 7);
        expect(region.w).toBeGreaterThanOrEqual(1);
        expect(region.h).toBeGreaterThanOrEqual(1);
        expect(region.x + region.w).toBeLessThanOrEqual(size);
        expect(region.y + region.h).toBeLessThanOrEqual(size + 1);
      }
    },
  );
});

describe('autoContentRegion', () => {
  it('rounded: insets by the corner radius on every side', () => {
    expect(autoContentRegion('rounded', 80, 80, 12)).toEqual({ x: 12, y: 12, w: 56, h: 56 });
  });

  it('rectangle: the full box', () => {
    expect(autoContentRegion('rectangle', 100, 50, 10)).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it('wide pill: inset by the radius along the long axis, full height on the short one', () => {
    expect(autoContentRegion('pill', 80, 40, 0)).toEqual({ x: 20, y: 0, w: 40, h: 40 });
  });

  it('tall pill: the same, mirrored', () => {
    expect(autoContentRegion('pill', 40, 80, 0)).toEqual({ x: 0, y: 20, w: 40, h: 40 });
  });

  it('square pill: draws as a circle, so it uses the inscribed square like an ellipse', () => {
    expect(autoContentRegion('pill', 80, 80, 0)).toEqual(autoContentRegion('ellipse', 80, 80, 0));
    expect(autoContentRegion('pill', 80, 80, 0)).toEqual({ x: 12, y: 12, w: 56, h: 56 });
  });

  it('ellipse: the inscribed rectangle, inset per axis', () => {
    // ceil(50 * (1 - 1/sqrt2)) = 15 horizontally, ceil(25 * (1 - 1/sqrt2)) = 8 vertically.
    expect(autoContentRegion('ellipse', 100, 50, 0)).toEqual({ x: 15, y: 8, w: 70, h: 34 });
  });

  it('circle: the inscribed square', () => {
    expect(autoContentRegion('ellipse', 80, 80, 0)).toEqual({ x: 12, y: 12, w: 56, h: 56 });
  });

  it('never returns a negative width/height (floors at 0)', () => {
    // A 1px ellipse insets by 1px per side, which would otherwise leave -1.
    expect(autoContentRegion('ellipse', 1, 1, 0)).toEqual({ x: 1, y: 1, w: 0, h: 0 });
  });
});

describe('resolveNinePatch', () => {
  it('image size is content size + 2 (the 1px frame on each side)', () => {
    const resolved = resolveNinePatch(cfg({ contentWidth: 120, contentHeight: 40 }));
    expect(resolved.imageWidth).toBe(122);
    expect(resolved.imageHeight).toBe(42);
  });

  it('with auto on, stretch and content both follow their auto regions', () => {
    const resolved = resolveNinePatch(
      cfg({
        shape: 'rounded',
        contentWidth: 80,
        contentHeight: 80,
        cornerRadius: 12,
        stretchAuto: true,
        contentAuto: true,
        stretch: { x: 1, y: 1, w: 1, h: 1 },
        content: { x: 2, y: 2, w: 2, h: 2 },
      }),
    );
    expect(resolved.stretch).toEqual({ x: 12, y: 12, w: 56, h: 56 });
    expect(resolved.content).toEqual({ x: 12, y: 12, w: 56, h: 56 });
    expect(resolved.radius).toBe(12);
    expect(resolved.maxRadius).toBe(40);
  });

  it('with auto off, stretch and content use the manual regions verbatim', () => {
    const manualStretch = { x: 5, y: 5, w: 10, h: 10 };
    const manualContent = { x: 20, y: 20, w: 5, h: 5 };
    const resolved = resolveNinePatch(
      cfg({
        contentWidth: 80,
        contentHeight: 80,
        stretchAuto: false,
        contentAuto: false,
        stretch: manualStretch,
        content: manualContent,
      }),
    );
    expect(resolved.stretch).toEqual(manualStretch);
    expect(resolved.content).toEqual(manualContent);
  });

  it('stretch and content can be resolved independently (one auto, one manual)', () => {
    const manualContent = { x: 3, y: 3, w: 4, h: 4 };
    const resolved = resolveNinePatch(
      cfg({
        shape: 'rounded',
        contentWidth: 80,
        contentHeight: 80,
        cornerRadius: 12,
        stretchAuto: true,
        contentAuto: false,
        content: manualContent,
      }),
    );
    expect(resolved.stretch).toEqual({ x: 12, y: 12, w: 56, h: 56 });
    expect(resolved.content).toEqual(manualContent);
  });

  it('stretch and content no longer share one region for a shape where they differ', () => {
    const resolved = resolveNinePatch(cfg({ shape: 'pill', contentWidth: 80, contentHeight: 40 }));
    expect(resolved.stretch).toEqual({ x: 20, y: 19, w: 40, h: 2 });
    expect(resolved.content).toEqual({ x: 20, y: 0, w: 40, h: 40 });
  });

  it.each([
    ['zero', 0, 1],
    ['negative', -5, 1],
    ['fractional (truncated, never below 1)', 12.9, 12],
    ['NaN', NaN, 1],
    ['Infinity', Infinity, 1],
    [`above MAX_CONTENT_SIZE (${MAX_CONTENT_SIZE})`, MAX_CONTENT_SIZE + 500, MAX_CONTENT_SIZE],
  ])('coerces a %s width to a renderable integer', (_name, contentWidth, expected) => {
    const resolved = resolveNinePatch(cfg({ contentWidth }));
    expect(resolved.contentWidth).toBe(expected);
    expect(resolved.imageWidth).toBe(expected + 2);
  });

  it('coerces the height the same way', () => {
    const resolved = resolveNinePatch(cfg({ contentHeight: -3 }));
    expect(resolved.contentHeight).toBe(1);
    expect(resolved.imageHeight).toBe(3);
  });

  it('derives the radius and auto regions from the coerced dimensions', () => {
    const resolved = resolveNinePatch(cfg({ shape: 'rounded', contentWidth: 0, contentHeight: 0, cornerRadius: 12 }));
    expect(resolved.radius).toBe(0);
    expect(resolved.maxRadius).toBe(0);
    expect(resolved.stretch).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(resolved.content).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});
