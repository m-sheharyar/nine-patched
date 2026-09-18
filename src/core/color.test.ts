import { describe, expect, it } from 'vitest';
import { hexToRgb, normalizeHex, rgbaStr } from './color';

describe('normalizeHex', () => {
  it.each([
    ['#rgb shorthand', '#0af', '#00aaff'],
    ['rrggbb without hash', 'ff00ff', '#ff00ff'],
    ['uppercase', '#FF00FF', '#ff00ff'],
    ['surrounding whitespace', '  #abc  ', '#aabbcc'],
    ['mixed case without hash', 'AbCdEf', '#abcdef'],
  ])('%s: normalizeHex(%p) === %p', (_name, input, expected) => {
    expect(normalizeHex(input)).toBe(expected);
  });

  it.each([
    ['empty string', ''],
    ['too short (2 chars)', '#ab'],
    ['too long (5 chars)', '#12345'],
    ['too long (7 chars)', '#1234567'],
    ['invalid characters (3 chars)', '#12g'],
    ['invalid characters (6 chars)', '#gggggg'],
  ])('%s: normalizeHex(%p) === null', (_name, input) => {
    expect(normalizeHex(input)).toBeNull();
  });
});

describe('hexToRgb', () => {
  it('parses a valid hex color', () => {
    expect(hexToRgb('#4caf50')).toEqual({ r: 76, g: 175, b: 80 });
  });

  it('falls back to black for an invalid hex color', () => {
    expect(hexToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('rgbaStr', () => {
  it.each([
    ['mid-range opacity', 50, 'rgba(76, 175, 80, 0.5)'],
    ['opacity above 100 clamps to 1', 150, 'rgba(76, 175, 80, 1)'],
    ['opacity below 0 clamps to 0', -20, 'rgba(76, 175, 80, 0)'],
    ['opacity at 0', 0, 'rgba(76, 175, 80, 0)'],
    ['opacity at 100', 100, 'rgba(76, 175, 80, 1)'],
  ])('%s: rgbaStr(#4caf50, %p) === %p', (_name, opacity, expected) => {
    expect(rgbaStr('#4caf50', opacity)).toBe(expected);
  });
});
