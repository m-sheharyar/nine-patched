import { describe, expect, it } from 'vitest';
import { FIT_FRACTION, fitScale, formatZoom, MAX_ZOOM, MIN_ZOOM, nextZoom, ZOOM_STEPS } from './zoom';

describe('fitScale', () => {
  it('leaves the artwork within FIT_FRACTION of the stage on both axes', () => {
    const [stageW, stageH, image] = [1100, 783, 82];
    const zoom = fitScale(stageW, stageH, image, image);
    expect((image * zoom) / stageW).toBeLessThanOrEqual(FIT_FRACTION);
    expect((image * zoom) / stageH).toBeLessThanOrEqual(FIT_FRACTION);
  });

  it('is the largest rung that still fits, not merely a rung that fits', () => {
    const zoom = fitScale(1100, 783, 82, 82);
    const next = ZOOM_STEPS[ZOOM_STEPS.indexOf(zoom) + 1];
    expect((82 * next) / 783).toBeGreaterThan(FIT_FRACTION);
  });

  it('only ever returns a ladder rung', () => {
    for (const stage of [200, 400, 640, 900, 1440, 2560]) {
      expect(ZOOM_STEPS).toContain(fitScale(stage, stage, 82, 82));
    }
  });

  it('is driven by the tighter axis for a non-square image', () => {
    expect(fitScale(1000, 1000, 122, 42)).toBe(fitScale(1000, 1000, 42, 122));
  });

  it('never goes below 1 even when the image cannot fit', () => {
    expect(fitScale(40, 40, 202, 202)).toBe(MIN_ZOOM);
    expect(fitScale(100, 100, 82, 82)).toBe(MIN_ZOOM);
  });

  it('caps at the maximum zoom for a tiny image in a large stage', () => {
    expect(fitScale(4000, 4000, 3, 3)).toBe(MAX_ZOOM);
  });

  it('falls back to 1 for a stage that has not been measured yet', () => {
    expect(fitScale(0, 0, 82, 82)).toBe(MIN_ZOOM);
    expect(fitScale(-10, 500, 82, 82)).toBe(MIN_ZOOM);
    expect(fitScale(Number.NaN, 500, 82, 82)).toBe(MIN_ZOOM);
  });

  it('frames the default artwork on a desktop stage and on a phone stage', () => {
    expect(fitScale(1100, 782, 82, 82)).toBe(5);
    expect(fitScale(390, 383, 82, 82)).toBe(2);
  });
});

describe('nextZoom', () => {
  it('walks up and down the ladder', () => {
    expect(nextZoom(4, 1)).toBe(5);
    expect(nextZoom(4, -1)).toBe(3);
  });

  it('jumps to the nearest rung when the current zoom sits between rungs', () => {
    expect(nextZoom(9, 1)).toBe(12);
    expect(nextZoom(9, -1)).toBe(8);
  });

  it('stops at the ends of the ladder', () => {
    expect(nextZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
    expect(nextZoom(100, 1)).toBe(MAX_ZOOM);
    expect(nextZoom(0, -1)).toBe(MIN_ZOOM);
  });

  it('reaches the maximum zoom from Fit, which the fit fraction never does', () => {
    let zoom = fitScale(1100, 783, 82, 82);
    while (zoom < MAX_ZOOM) zoom = nextZoom(zoom, 1);
    expect(zoom).toBe(MAX_ZOOM);
  });

  it('only offers integer zoom levels', () => {
    expect(ZOOM_STEPS.every(Number.isInteger)).toBe(true);
  });
});

describe('formatZoom', () => {
  it('renders the readout', () => {
    expect(formatZoom(4)).toBe('4×');
  });
});
