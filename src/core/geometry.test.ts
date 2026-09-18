import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './defaults';
import { autoRegion, effectiveRadius, resolveNinePatch } from './geometry';
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

describe('autoRegion', () => {
  it('rounded: insets by the corner radius on every side', () => {
    expect(autoRegion('rounded', 80, 80, 12)).toEqual({ x: 12, y: 12, w: 56, h: 56 });
  });

  it('rectangle: the auto region is the full box (no radius to inset by)', () => {
    expect(autoRegion('rectangle', 100, 50, 10)).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it('pill: an odd smaller dimension leaves a sliver via floor rounding', () => {
    expect(autoRegion('pill', 80, 41, 0)).toEqual({ x: 20, y: 20, w: 40, h: 1 });
  });

  it('ellipse: an odd smaller dimension leaves a sliver via floor rounding', () => {
    expect(autoRegion('ellipse', 41, 80, 0)).toEqual({ x: 20, y: 20, w: 1, h: 40 });
  });

  it('never returns a negative width/height (floors at 0)', () => {
    const region = autoRegion('pill', 80, 40, 0);
    expect(region.w).toBeGreaterThanOrEqual(0);
    expect(region.h).toBeGreaterThanOrEqual(0);
  });

  // Known bug: pill with even height has no vertical stretch marker (autoRegion.h is exactly 0,
  // because the radius used for a pill is always exactly half of the smaller dimension, which
  // consumes that entire dimension). Correct behaviour should leave at least 1px of stretch.
  it.fails('pill with an even height still has a non-empty vertical stretch region', () => {
    expect(autoRegion('pill', 80, 40, 0).h).toBeGreaterThanOrEqual(1);
  });
});

describe('resolveNinePatch', () => {
  it('image size is content size + 2 (the 1px frame on each side)', () => {
    const resolved = resolveNinePatch(cfg({ contentWidth: 120, contentHeight: 40 }));
    expect(resolved.imageWidth).toBe(122);
    expect(resolved.imageHeight).toBe(42);
  });

  it('with auto on, stretch and content both follow autoRegion', () => {
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
});
