import { describe, expect, it } from 'vitest';
import { cssGradient, gradientLine, sortedStops } from './gradient';
import type { GradientStop } from './types';

describe('gradientLine', () => {
  describe('square box (0,0,80,80)', () => {
    it.each([
      [0, { x0: 40, y0: 80, x1: 40, y1: 0 }],
      [90, { x0: 0, y0: 40, x1: 80, y1: 40 }],
      [180, { x0: 40, y0: 0, x1: 40, y1: 80 }],
      [270, { x0: 80, y0: 40, x1: 0, y1: 40 }],
      [45, { x0: 0, y0: 80, x1: 80, y1: 0 }],
    ])('%sdeg', (angle, expected) => {
      const line = gradientLine(0, 0, 80, 80, angle);
      expect(line.x0).toBeCloseTo(expected.x0, 5);
      expect(line.y0).toBeCloseTo(expected.y0, 5);
      expect(line.x1).toBeCloseTo(expected.x1, 5);
      expect(line.y1).toBeCloseTo(expected.y1, 5);
    });
  });

  describe('non-square box (0,0,10,20)', () => {
    it.each([
      [0, { x0: 5, y0: 20, x1: 5, y1: 0 }],
      [90, { x0: 0, y0: 10, x1: 10, y1: 10 }],
      [180, { x0: 5, y0: 0, x1: 5, y1: 20 }],
      [270, { x0: 10, y0: 10, x1: 0, y1: 10 }],
      [45, { x0: -2.5, y0: 17.5, x1: 12.5, y1: 2.5 }],
    ])('%sdeg', (angle, expected) => {
      const line = gradientLine(0, 0, 10, 20, angle);
      expect(line.x0).toBeCloseTo(expected.x0, 5);
      expect(line.y0).toBeCloseTo(expected.y0, 5);
      expect(line.x1).toBeCloseTo(expected.x1, 5);
      expect(line.y1).toBeCloseTo(expected.y1, 5);
    });

    it('at 45deg the line length equals |w sin a| + |h cos a|', () => {
      const w = 10;
      const h = 20;
      const a = (45 * Math.PI) / 180;
      const expectedLength = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
      const { x0, y0, x1, y1 } = gradientLine(0, 0, w, h, 45);
      const actualLength = Math.hypot(x1 - x0, y1 - y0);
      expect(actualLength).toBeCloseTo(expectedLength, 5);
    });
  });

  it('respects a non-zero box origin', () => {
    const line = gradientLine(5, 7, 80, 80, 0);
    expect(line.x0).toBeCloseTo(45, 5);
    expect(line.y0).toBeCloseTo(87, 5);
    expect(line.x1).toBeCloseTo(45, 5);
    expect(line.y1).toBeCloseTo(7, 5);
  });
});

describe('sortedStops', () => {
  it('sorts by position ascending', () => {
    const stops: GradientStop[] = [
      { color: '#000000', position: 80, opacity: 100 },
      { color: '#ffffff', position: 10, opacity: 50 },
      { color: '#ff0000', position: 50, opacity: 20 },
    ];
    expect(sortedStops(stops).map((s) => s.position)).toEqual([10, 50, 80]);
  });

  it('does not mutate the input array', () => {
    const stops: GradientStop[] = [
      { color: '#000000', position: 80, opacity: 100 },
      { color: '#ffffff', position: 10, opacity: 50 },
    ];
    const snapshot = stops.map((s) => ({ ...s }));
    const result = sortedStops(stops);
    expect(stops).toEqual(snapshot);
    expect(result).not.toBe(stops);
  });
});

describe('cssGradient', () => {
  it('builds a linear-gradient string with sorted, rgba stops', () => {
    const stops: GradientStop[] = [
      { color: '#ff0000', position: 0, opacity: 100 },
      { color: '#0000ff', position: 100, opacity: 100 },
    ];
    expect(cssGradient(90, stops)).toBe('linear-gradient(90deg, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)');
  });

  it('sorts unordered stops before building the string', () => {
    const stops: GradientStop[] = [
      { color: '#0000ff', position: 100, opacity: 100 },
      { color: '#ff0000', position: 0, opacity: 100 },
    ];
    expect(cssGradient(0, stops)).toBe('linear-gradient(0deg, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)');
  });

  it('clamps out-of-range stop positions to 0-100%', () => {
    const stops: GradientStop[] = [
      { color: '#ff0000', position: -30, opacity: 100 },
      { color: '#0000ff', position: 150, opacity: 100 },
    ];
    expect(cssGradient(45, stops)).toBe('linear-gradient(45deg, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)');
  });
});
