import { describe, expect, it } from 'vitest';
import { sanitizeFileName } from './sanitizeFileName';

const sanitize = (name: string) => sanitizeFileName(name, 'nine_patch');

describe('sanitizeFileName', () => {
  it.each([
    ['leaves an already-safe name alone', 'my-custom-name', 'my-custom-name'],
    ['trims surrounding whitespace', '  spaced out  ', 'spaced out'],
    ['replaces path separators and a colon', 'my/asset:v2', 'my_asset_v2'],
    ['replaces a backslash', 'my\\asset', 'my_asset'],
    ['collapses a run of illegal characters into one underscore', 'a<>:"|?*b', 'a_b'],
    ['replaces control characters', 'a\x00\x1fb\x7f', 'a_b_'],
    ['strips a typed .9.png extension', 'button.9.png', 'button'],
    ['strips a typed .png extension', 'button.png', 'button'],
    ['is case-insensitive about the extension', 'button.9.PNG', 'button'],
    ['keeps a dot that is not an extension', 'v1.2', 'v1.2'],
    ['keeps an unrelated extension', 'button.jpg', 'button.jpg'],
    ['a name of only illegal characters becomes a single underscore', ' /// ', '_'],
  ])('%s', (_name, input, expected) => {
    expect(sanitize(input)).toBe(expected);
  });

  it.each([
    ['an empty name', ''],
    ['a whitespace-only name', '   '],
    ['a name that is only an extension', '.9.png'],
    ['a name that is only a .png extension', '.png'],
  ])('falls back to the default for %s', (_name, input) => {
    expect(sanitize(input)).toBe('nine_patch');
  });

  it('uses the caller-supplied fallback', () => {
    expect(sanitizeFileName('   ', 'other_default')).toBe('other_default');
  });
});
