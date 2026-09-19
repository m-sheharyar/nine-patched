import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './defaults';
import type { NinePatchConfig } from './types';
import type { StretchUniformity } from './uniformity';
import { ninePatchWarnings } from './warnings';

const cfg = (overrides: Partial<NinePatchConfig>): NinePatchConfig => ({ ...DEFAULT_CONFIG, ...overrides });

describe('ninePatchWarnings', () => {
  it('has no warnings for the default config', () => {
    expect(ninePatchWarnings(DEFAULT_CONFIG)).toEqual([]);
  });

  it('warns when stretch is disabled', () => {
    const warnings = ninePatchWarnings(cfg({ stretchEnabled: false }));
    expect(warnings).toContain(
      "No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).",
    );
  });

  it('warns when a manual stretch region has zero width', () => {
    const warnings = ninePatchWarnings(cfg({ stretchAuto: false, stretch: { x: 0, y: 0, w: 0, h: 10 } }));
    expect(warnings).toContain(
      "No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).",
    );
  });

  it('warns when a manual stretch region has zero height', () => {
    const warnings = ninePatchWarnings(cfg({ stretchAuto: false, stretch: { x: 0, y: 0, w: 10, h: 0 } }));
    expect(warnings).toContain(
      "No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).",
    );
  });

  it('warns when the corner radius exceeds what the current size allows', () => {
    const warnings = ninePatchWarnings(
      cfg({ shape: 'rounded', contentWidth: 10, contentHeight: 10, cornerRadius: 20 }),
    );
    expect(warnings).toContain(
      'Corner radius is limited to 5px by the current size. Increase the size to use a larger radius.',
    );
  });

  it('does not warn about corner radius for non-rounded shapes even if cornerRadius is large', () => {
    const warnings = ninePatchWarnings(cfg({ shape: 'pill', contentWidth: 10, contentHeight: 10, cornerRadius: 999 }));
    expect(warnings.some((w) => w.startsWith('Corner radius'))).toBe(false);
  });

  it('can report both warnings at once', () => {
    const warnings = ninePatchWarnings(
      cfg({ shape: 'rounded', contentWidth: 10, contentHeight: 10, cornerRadius: 20, stretchEnabled: false }),
    );
    expect(warnings).toHaveLength(2);
  });
});

describe('row 22: uniformity warnings', () => {
  const HORIZONTAL =
    'The horizontal stretch region is not uniform: its pixels change from left to right, so the image may look uneven when stretched wider. Use a fill that does not change along that axis, or a 1px wide stretch region.';
  const VERTICAL =
    'The vertical stretch region is not uniform: its pixels change from top to bottom, so the image may look uneven when stretched taller. Use a fill that does not change along that axis, or a 1px tall stretch region.';
  const NO_MARKERS = "No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).";
  const RADIUS = 'Corner radius is limited to 5px by the current size. Increase the size to use a larger radius.';
  const small: Partial<NinePatchConfig> = { shape: 'rounded', contentWidth: 10, contentHeight: 10, cornerRadius: 20 };

  it('omitting the second argument leaves the existing warnings alone', () => {
    expect(ninePatchWarnings(DEFAULT_CONFIG)).toEqual([]);
  });

  it.each<[string, NinePatchConfig, StretchUniformity, string[]]>([
    ['both axes uniform', DEFAULT_CONFIG, { horizontal: true, vertical: true }, []],
    ['horizontal only', DEFAULT_CONFIG, { horizontal: false, vertical: true }, [HORIZONTAL]],
    ['vertical only', DEFAULT_CONFIG, { horizontal: true, vertical: false }, [VERTICAL]],
    ['both, horizontal first', DEFAULT_CONFIG, { horizontal: false, vertical: false }, [HORIZONTAL, VERTICAL]],
    [
      'both, after an existing warning',
      cfg(small),
      { horizontal: false, vertical: false },
      [RADIUS, HORIZONTAL, VERTICAL],
    ],
    [
      'stretch disabled ignores uniformity',
      cfg({ stretchEnabled: false }),
      { horizontal: false, vertical: false },
      [NO_MARKERS],
    ],
  ])('%s', (_name, config, uniformity, expected) => {
    expect(ninePatchWarnings(config, uniformity)).toEqual(expected);
  });
});
