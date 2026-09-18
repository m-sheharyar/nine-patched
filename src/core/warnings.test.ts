import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './defaults';
import type { NinePatchConfig } from './types';
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
    const warnings = ninePatchWarnings(
      cfg({ stretchAuto: false, stretch: { x: 0, y: 0, w: 0, h: 10 } }),
    );
    expect(warnings).toContain(
      "No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).",
    );
  });

  it('warns when a manual stretch region has zero height', () => {
    const warnings = ninePatchWarnings(
      cfg({ stretchAuto: false, stretch: { x: 0, y: 0, w: 10, h: 0 } }),
    );
    expect(warnings).toContain(
      "No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).",
    );
  });

  it('warns when the corner radius exceeds what the current size allows', () => {
    const warnings = ninePatchWarnings(cfg({ shape: 'rounded', contentWidth: 10, contentHeight: 10, cornerRadius: 20 }));
    expect(warnings).toContain('Corner radius is limited to 5px by the current size. Increase the size to use a larger radius.');
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
