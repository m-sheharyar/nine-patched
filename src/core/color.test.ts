import { describe, expect, it } from 'vitest';
import { hexToRgb, mixHex, normalizeHex, rgbaStr } from './color';

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

describe('mixHex', () => {
  it.each([
    ['t = 0 returns the first color', '#ff0000', '#0000ff', 0, '#ff0000'],
    ['t = 1 returns the second color', '#ff0000', '#0000ff', 1, '#0000ff'],
    ['t = 0.5 is the midpoint', '#ff0000', '#0000ff', 0.5, '#800080'],
    ['rounds each channel to an integer', '#000000', '#010101', 0.5, '#010101'],
    ['t below 0 clamps to the first color', '#ff0000', '#0000ff', -1, '#ff0000'],
    ['t above 1 clamps to the second color', '#ff0000', '#0000ff', 2, '#0000ff'],
    ['pads single-digit channels', '#000000', '#0a141e', 1, '#0a141e'],
    ['an invalid color is treated as black', 'nope', '#ffffff', 0.5, '#808080'],
  ])('%s', (_name, from, to, t, expected) => {
    expect(mixHex(from, to, t)).toBe(expected);
  });

  it('accepts shorthand hex on either side', () => {
    expect(mixHex('#f00', '#00f', 0.5)).toBe('#800080');
  });
});
