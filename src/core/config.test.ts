import { describe, expect, it } from 'vitest';
import { normalizeHex } from './color';
import {
  CONFIG_VERSION,
  MAX_ENCODED_LENGTH,
  MAX_GRADIENT_STOPS,
  MIN_GRADIENT_STOPS,
  decodeConfig,
  encodeConfig,
  parseConfig,
  parseConfigDocument,
  serializeConfigDocument,
} from './config';
import { DEFAULT_CONFIG, DEFAULT_FILE_NAME } from './defaults';
import { MAX_CONTENT_SIZE, resolveNinePatch } from './geometry';
import { renderNinePatch } from './render';
import type { GradientStop, NinePatchConfig, NinePatchContext, Region } from './types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Every bad-field assertion the spec makes: exactly one issue, and it names the field. */
function expectSingleIssueFor(issues: string[], field: string) {
  expect(issues).toHaveLength(1);
  expect(issues[0].startsWith(field)).toBe(true);
}

/** A stub NinePatchContext with no-op drawing calls, for feeding arbitrary configs to renderNinePatch. */
function createStubContext(): NinePatchContext {
  return {
    fillStyle: '#000000',
    globalCompositeOperation: 'source-over',
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    ellipse: () => {},
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }) as unknown as CanvasGradient,
  };
}

/**
 * A validity checker built directly from the spec's field table (`feature-1a-config-core.md`),
 * not from the implementation. Used to check that parseConfig/parseConfigDocument/decodeConfig
 * never hand back something unsafe to resolve or render.
 */
function isValidConfig(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;

  const isHex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v);
  const isFiniteInRange = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const isIntInRange = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  const isBool = (v: unknown) => typeof v === 'boolean';

  const isRegion = (v: unknown): boolean => {
    if (typeof v !== 'object' || v === null) return false;
    const r = v as Record<string, unknown>;
    return (
      Object.keys(r).length === 4 &&
      isIntInRange(r.x, 0, MAX_CONTENT_SIZE) &&
      isIntInRange(r.y, 0, MAX_CONTENT_SIZE) &&
      isIntInRange(r.w, 0, MAX_CONTENT_SIZE) &&
      isIntInRange(r.h, 0, MAX_CONTENT_SIZE)
    );
  };

  const isStop = (v: unknown): boolean => {
    if (typeof v !== 'object' || v === null) return false;
    const s = v as Record<string, unknown>;
    return (
      Object.keys(s).length === 3 &&
      isHex(s.color) &&
      isFiniteInRange(s.position, 0, 100) &&
      isFiniteInRange(s.opacity, 0, 100)
    );
  };

  const expectedKeys = Object.keys(DEFAULT_CONFIG);
  const stops = c.gradientStops;

  return (
    Object.keys(c).length === expectedKeys.length &&
    expectedKeys.every((k) => k in c) &&
    (c.shape === 'rounded' || c.shape === 'pill' || c.shape === 'ellipse' || c.shape === 'rectangle') &&
    (c.fillType === 'solid' || c.fillType === 'gradient') &&
    isIntInRange(c.contentWidth, 1, MAX_CONTENT_SIZE) &&
    isIntInRange(c.contentHeight, 1, MAX_CONTENT_SIZE) &&
    isFiniteInRange(c.cornerRadius, 0, MAX_CONTENT_SIZE / 2) &&
    isFiniteInRange(c.borderWidth, 0, MAX_CONTENT_SIZE / 2) &&
    isFiniteInRange(c.fillOpacity, 0, 100) &&
    isFiniteInRange(c.gradientAngle, 0, 360) &&
    isHex(c.fillColor) &&
    isHex(c.backgroundColor) &&
    isHex(c.borderColor) &&
    isBool(c.bgTransparent) &&
    isBool(c.stretchEnabled) &&
    isBool(c.stretchAuto) &&
    isBool(c.contentEnabled) &&
    isBool(c.contentAuto) &&
    Array.isArray(stops) &&
    stops.length >= MIN_GRADIENT_STOPS &&
    stops.length <= MAX_GRADIENT_STOPS &&
    stops.every(isStop) &&
    isRegion(c.stretch) &&
    isRegion(c.content)
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('match the spec', () => {
    expect(CONFIG_VERSION).toBe(1);
    expect(MAX_GRADIENT_STOPS).toBe(12);
    expect(MIN_GRADIENT_STOPS).toBe(2);
    expect(MAX_ENCODED_LENGTH).toBe(8192);
  });
});

// ---------------------------------------------------------------------------
// isValidConfig self-check (guards against a checker that is silently always true/false)
// ---------------------------------------------------------------------------

describe('isValidConfig (test helper sanity)', () => {
  it('accepts DEFAULT_CONFIG', () => {
    expect(isValidConfig(DEFAULT_CONFIG)).toBe(true);
  });

  it('rejects an out-of-range field', () => {
    expect(isValidConfig({ ...DEFAULT_CONFIG, contentWidth: 0 })).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isValidConfig('nope')).toBe(false);
    expect(isValidConfig(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseConfig
// ---------------------------------------------------------------------------

describe('parseConfig', () => {
  describe('general behaviour', () => {
    it.each<[string, unknown]>([
      ['null', null],
      ['undefined', undefined],
      ['array', []],
      ['string', 'nope'],
      ['number', 42],
      ['boolean', true],
    ])('non-object input (%s) gives DEFAULT_CONFIG values and exactly one issue', (_name, input) => {
      const result = parseConfig(input);
      expect(result.config).toEqual(DEFAULT_CONFIG);
      expect(result.issues).toHaveLength(1);
    });

    it.each<[string, unknown]>([
      ['a function', () => {}],
      ['a Symbol', Symbol('x')],
      ['a Date instance', new Date()],
      ['a Map', new Map()],
      [
        'a self-referencing object',
        (() => {
          const o: Record<string, unknown> = {};
          o.self = o;
          return o;
        })(),
      ],
      ['a deeply nested garbage object', { a: { b: { c: { d: [1, 2, [3, { e: null }]] } } } }],
    ])('never throws for %s', (_name, input) => {
      expect(() => parseConfig(input)).not.toThrow();
    });

    it('gives DEFAULT_CONFIG values with no issues for an empty object', () => {
      const result = parseConfig({});
      expect(result.config).toEqual(DEFAULT_CONFIG);
      expect(result.issues).toEqual([]);
    });

    it('drops unknown keys silently', () => {
      const input: Record<string, unknown> = { ...DEFAULT_CONFIG, thisIsNotAField: 'nope', 42: 'also not a field' };
      const result = parseConfig(input);
      expect(result.config).toEqual(DEFAULT_CONFIG);
      expect(result.issues).toEqual([]);
      expect(result.config).not.toHaveProperty('thisIsNotAField');
    });

    it('reads keys as own properties only; inherited enumerable keys are treated as missing', () => {
      const proto = { shape: 'pill' };
      const input = Object.create(proto) as unknown;
      const result = parseConfig(input);
      expect(result.config.shape).toBe(DEFAULT_CONFIG.shape);
      expect(result.issues).toEqual([]);
    });

    it('drops __proto__ given as an own property (via JSON.parse) without polluting any prototype', () => {
      const malicious = JSON.parse('{"__proto__":{"polluted":"yes"},"shape":"pill"}') as unknown;
      // Sanity: JSON.parse makes __proto__ an own enumerable data property, not the actual prototype link.
      expect(Object.prototype.hasOwnProperty.call(malicious, '__proto__')).toBe(true);

      const result = parseConfig(malicious);
      expect(result.config.shape).toBe('pill');
      expect(result.issues).toEqual([]);
      expect(Object.getPrototypeOf(result.config)).toBe(Object.prototype);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('drops a "constructor" key without polluting any prototype', () => {
      const malicious = JSON.parse(
        '{"constructor":{"prototype":{"pollutedViaConstructor":true}},"shape":"ellipse"}',
      ) as unknown;
      const result = parseConfig(malicious);
      expect(result.config.shape).toBe('ellipse');
      expect(result.issues).toEqual([]);
      expect(({} as Record<string, unknown>).pollutedViaConstructor).toBeUndefined();
    });

    it('drops a "prototype" key without polluting any prototype', () => {
      const malicious = JSON.parse('{"prototype":{"pollutedViaPrototype":true},"shape":"rectangle"}') as unknown;
      const result = parseConfig(malicious);
      expect(result.config.shape).toBe('rectangle');
      expect(result.issues).toEqual([]);
      expect(({} as Record<string, unknown>).pollutedViaPrototype).toBeUndefined();
    });

    it('reports exactly one issue per invalid field, independent of the others', () => {
      const input: Record<string, unknown> = {
        shape: 'circle',
        contentWidth: 'nope',
        fillColor: 'not-a-color',
      };
      const result = parseConfig(input);
      expect(result.issues).toHaveLength(3);
      expect(result.issues.some((i) => i.startsWith('shape'))).toBe(true);
      expect(result.issues.some((i) => i.startsWith('contentWidth'))).toBe(true);
      expect(result.issues.some((i) => i.startsWith('fillColor'))).toBe(true);
    });

    it('returns a config with no shared references to DEFAULT_CONFIG', () => {
      const result = parseConfig({});
      expect(result.config).not.toBe(DEFAULT_CONFIG);
      expect(result.config.stretch).not.toBe(DEFAULT_CONFIG.stretch);
      expect(result.config.content).not.toBe(DEFAULT_CONFIG.content);
      expect(result.config.gradientStops).not.toBe(DEFAULT_CONFIG.gradientStops);
      expect(result.config.gradientStops[0]).not.toBe(DEFAULT_CONFIG.gradientStops[0]);

      result.config.stretch.x = 999;
      result.config.gradientStops[0].color = '#000000';
      expect(DEFAULT_CONFIG.stretch.x).toBe(0);
      expect(DEFAULT_CONFIG.gradientStops[0].color).toBe('#4caf50');
    });

    it('returns a config with no shared references to the input', () => {
      const input = {
        stretch: { x: 1, y: 2, w: 3, h: 4 },
        content: { x: 5, y: 6, w: 7, h: 8 },
        gradientStops: [
          { color: '#111111', position: 0, opacity: 100 },
          { color: '#222222', position: 100, opacity: 100 },
        ],
      };
      const result = parseConfig(input);
      expect(result.config.stretch).not.toBe(input.stretch);
      expect(result.config.content).not.toBe(input.content);
      expect(result.config.gradientStops).not.toBe(input.gradientStops);
      expect(result.config.gradientStops[0]).not.toBe(input.gradientStops[0]);

      result.config.stretch.x = 999;
      expect(input.stretch.x).toBe(1);
    });
  });

  describe('shape', () => {
    it.each(['rounded', 'pill', 'ellipse', 'rectangle'] as const)('accepts %s', (value) => {
      const input: Record<string, unknown> = { shape: value };
      const result = parseConfig(input);
      expect(result.config.shape).toBe(value);
      expect(result.issues).toEqual([]);
    });

    it.each<[string, unknown]>([
      ['an unknown string', 'circle'],
      ['a number', 5],
      ['null', null],
      ['a boolean', true],
      ['an array', []],
      ['an object', {}],
    ])('rejects %s', (_name, value) => {
      const input: Record<string, unknown> = { shape: value };
      const result = parseConfig(input);
      expect(result.config.shape).toBe(DEFAULT_CONFIG.shape);
      expectSingleIssueFor(result.issues, 'shape');
    });

    it('is silently defaulted when missing', () => {
      const result = parseConfig({ fillType: 'solid' });
      expect(result.config.shape).toBe(DEFAULT_CONFIG.shape);
      expect(result.issues).toEqual([]);
    });
  });

  describe('fillType', () => {
    it.each(['solid', 'gradient'] as const)('accepts %s', (value) => {
      const input: Record<string, unknown> = { fillType: value };
      const result = parseConfig(input);
      expect(result.config.fillType).toBe(value);
      expect(result.issues).toEqual([]);
    });

    it.each<[string, unknown]>([
      ['an unknown string', 'radial'],
      ['a number', 1],
      ['null', null],
      ['a boolean', false],
      ['an array', []],
    ])('rejects %s', (_name, value) => {
      const input: Record<string, unknown> = { fillType: value };
      const result = parseConfig(input);
      expect(result.config.fillType).toBe(DEFAULT_CONFIG.fillType);
      expectSingleIssueFor(result.issues, 'fillType');
    });

    it('is silently defaulted when missing', () => {
      const result = parseConfig({ shape: 'pill' });
      expect(result.config.fillType).toBe(DEFAULT_CONFIG.fillType);
      expect(result.issues).toEqual([]);
    });
  });

  describe.each<'contentWidth' | 'contentHeight'>(['contentWidth', 'contentHeight'])('%s', (field) => {
    it.each<[string, number]>([
      ['a mid-range value', 500],
      ['the lower boundary', 1],
      ['the upper boundary', MAX_CONTENT_SIZE],
    ])('accepts %s', (_name, value) => {
      const input: Record<string, unknown> = { [field]: value };
      const result = parseConfig(input);
      expect(result.config[field]).toBe(value);
      expect(result.issues).toEqual([]);
    });

    it.each<[string, unknown]>([
      ['zero (just below the lower boundary)', 0],
      ['negative', -5],
      ['just above the upper boundary', MAX_CONTENT_SIZE + 1],
      ['a non-integer', 1.5],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
      ['a numeric string', '100'],
      ['null', null],
      ['a boolean', true],
      ['an array', []],
      ['an object', {}],
    ])('rejects %s', (_name, value) => {
      const input: Record<string, unknown> = { [field]: value };
      const result = parseConfig(input);
      expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
      expectSingleIssueFor(result.issues, field);
    });

    it('is silently defaulted when missing', () => {
      const result = parseConfig({});
      expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
      expect(result.issues).toEqual([]);
    });
  });

  describe.each<[keyof NinePatchConfig, number, number]>([
    ['cornerRadius', 0, MAX_CONTENT_SIZE / 2],
    ['borderWidth', 0, MAX_CONTENT_SIZE / 2],
    ['fillOpacity', 0, 100],
    ['gradientAngle', 0, 360],
  ])('%s', (field, min, max) => {
    it.each<[string, number]>([
      ['a mid-range decimal value', (min + max) / 2 + 0.25],
      ['the lower boundary', min],
      ['the upper boundary', max],
    ])('accepts %s', (_name, value) => {
      const input: Record<string, unknown> = { [field]: value };
      const result = parseConfig(input);
      expect(result.config[field]).toBe(value);
      expect(result.issues).toEqual([]);
    });

    it.each<[string, unknown]>([
      ['just below the lower boundary', min - 1],
      ['just above the upper boundary', max + 1],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
      ['a numeric string', String(min)],
      ['null', null],
      ['a boolean', true],
      ['an array', []],
    ])('rejects %s', (_name, value) => {
      const input: Record<string, unknown> = { [field]: value };
      const result = parseConfig(input);
      expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
      expectSingleIssueFor(result.issues, field as string);
    });

    it('is silently defaulted when missing', () => {
      const result = parseConfig({});
      expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
      expect(result.issues).toEqual([]);
    });
  });

  describe.each<'fillColor' | 'backgroundColor' | 'borderColor'>(['fillColor', 'backgroundColor', 'borderColor'])(
    '%s',
    (field) => {
      it.each<[string, string]>([
        ['a 6-digit hex color', '#4caf50'],
        ['a 3-digit shorthand', '#abc'],
        ['uppercase', '#FF00FF'],
        ['without a leading hash', 'ff00ff'],
      ])('accepts %s and stores the normalised form', (_name, value) => {
        const input: Record<string, unknown> = { [field]: value };
        const result = parseConfig(input);
        expect(result.config[field]).toBe(normalizeHex(value));
        expect(result.issues).toEqual([]);
      });

      it.each<[string, unknown]>([
        ['not a color', 'not-a-color'],
        ['empty string', ''],
        ['too short', '#ab'],
        ['too long', '#1234567'],
        ['invalid hex characters', '#gggggg'],
        ['a number', 123],
        ['null', null],
        ['a boolean', true],
        ['an array', []],
      ])('rejects %s', (_name, value) => {
        const input: Record<string, unknown> = { [field]: value };
        const result = parseConfig(input);
        expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
        expectSingleIssueFor(result.issues, field);
      });

      it('is silently defaulted when missing', () => {
        const result = parseConfig({});
        expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
        expect(result.issues).toEqual([]);
      });
    },
  );

  describe.each<'bgTransparent' | 'stretchEnabled' | 'stretchAuto' | 'contentEnabled' | 'contentAuto'>([
    'bgTransparent',
    'stretchEnabled',
    'stretchAuto',
    'contentEnabled',
    'contentAuto',
  ])('%s', (field) => {
    it.each([true, false])('accepts %s', (value) => {
      const input: Record<string, unknown> = { [field]: value };
      const result = parseConfig(input);
      expect(result.config[field]).toBe(value);
      expect(result.issues).toEqual([]);
    });

    it.each<[string, unknown]>([
      ['the string "true"', 'true'],
      ['the number 1', 1],
      ['the number 0', 0],
      ['null', null],
      ['an object', {}],
      ['an array', []],
    ])('rejects %s', (_name, value) => {
      const input: Record<string, unknown> = { [field]: value };
      const result = parseConfig(input);
      expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
      expectSingleIssueFor(result.issues, field);
    });

    it('is silently defaulted when missing', () => {
      const result = parseConfig({});
      expect(result.config[field]).toBe(DEFAULT_CONFIG[field]);
      expect(result.issues).toEqual([]);
    });
  });

  describe.each<'stretch' | 'content'>(['stretch', 'content'])('%s', (field) => {
    it('accepts a fully valid region', () => {
      const value = { x: 1, y: 2, w: 3, h: 4 };
      const input: Record<string, unknown> = { [field]: value };
      const result = parseConfig(input);
      expect(result.config[field]).toEqual(value);
      expect(result.issues).toEqual([]);
    });

    it.each(['x', 'y', 'w', 'h'] as const)(
      'accepts member %s at both boundaries (0 and MAX_CONTENT_SIZE)',
      (member) => {
        const low: Record<string, unknown> = { x: 0, y: 0, w: 0, h: 0, [member]: 0 };
        const high: Record<string, unknown> = { x: 0, y: 0, w: 0, h: 0, [member]: MAX_CONTENT_SIZE };
        expect(parseConfig({ [field]: low }).issues).toEqual([]);
        const highResult = parseConfig({ [field]: high });
        expect(highResult.issues).toEqual([]);
        expect((highResult.config[field] as Region)[member]).toBe(MAX_CONTENT_SIZE);
      },
    );

    it.each(['x', 'y', 'w', 'h'] as const)(
      'falls back the whole region when member %s is just out of range',
      (member) => {
        const tooLow: Record<string, unknown> = { x: 0, y: 0, w: 0, h: 0, [member]: -1 };
        const tooHigh: Record<string, unknown> = { x: 0, y: 0, w: 0, h: 0, [member]: MAX_CONTENT_SIZE + 1 };
        for (const bad of [tooLow, tooHigh]) {
          const result = parseConfig({ [field]: bad });
          expect(result.config[field]).toEqual(DEFAULT_CONFIG[field]);
          expectSingleIssueFor(result.issues, field);
        }
      },
    );

    it.each<[string, unknown]>([
      ['a non-integer member', { x: 1.5, y: 0, w: 0, h: 0 }],
      ['a missing member', { x: 0, y: 0, w: 0 }],
      ['a NaN member', { x: NaN, y: 0, w: 0, h: 0 }],
      ['a string member', { x: '1', y: 0, w: 0, h: 0 }],
      ['not an object', 'nope'],
      ['an array', [1, 2, 3, 4]],
      ['null', null],
      ['a number', 5],
    ])('falls back the whole region for %s', (_name, bad) => {
      const input: Record<string, unknown> = { [field]: bad };
      const result = parseConfig(input);
      expect(result.config[field]).toEqual(DEFAULT_CONFIG[field]);
      expectSingleIssueFor(result.issues, field);
    });

    it('is silently defaulted when missing', () => {
      const result = parseConfig({});
      expect(result.config[field]).toEqual(DEFAULT_CONFIG[field]);
      expect(result.issues).toEqual([]);
    });
  });

  describe('gradientStops', () => {
    const stopAt = (position: number): GradientStop => ({ color: '#123456', position, opacity: 80 });

    it('accepts the minimum of 2 stops', () => {
      const stops = [stopAt(0), stopAt(100)];
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops).toEqual(stops);
      expect(result.issues).toEqual([]);
    });

    it('accepts the maximum of 12 stops', () => {
      const stops = Array.from({ length: MAX_GRADIENT_STOPS }, (_, i) => stopAt((i * 100) / (MAX_GRADIENT_STOPS - 1)));
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops).toEqual(stops);
      expect(result.issues).toEqual([]);
    });

    it('accepts a decimal position/opacity', () => {
      const stops = [{ color: '#123456', position: 33.3, opacity: 66.6 }, stopAt(100)];
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops).toEqual(stops);
      expect(result.issues).toEqual([]);
    });

    it('falls back to the default stops for a single stop (just below the minimum)', () => {
      const result = parseConfig({ gradientStops: [stopAt(0)] });
      expect(result.config.gradientStops).toEqual(DEFAULT_CONFIG.gradientStops);
      expectSingleIssueFor(result.issues, 'gradientStops');
    });

    it('falls back to the default stops for an empty array', () => {
      const result = parseConfig({ gradientStops: [] });
      expect(result.config.gradientStops).toEqual(DEFAULT_CONFIG.gradientStops);
      expectSingleIssueFor(result.issues, 'gradientStops');
    });

    it('keeps the first 12 stops and reports one issue for 13 stops (just above the maximum)', () => {
      const stops = Array.from({ length: MAX_GRADIENT_STOPS + 1 }, (_, i) => stopAt((i * 100) / MAX_GRADIENT_STOPS));
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops).toEqual(stops.slice(0, MAX_GRADIENT_STOPS));
      expectSingleIssueFor(result.issues, 'gradientStops');
    });

    it('validates only the 12 stops it keeps, so a bad stop past the cap is dropped with the rest', () => {
      const kept = Array.from({ length: MAX_GRADIENT_STOPS }, (_, i) => stopAt((i * 100) / MAX_GRADIENT_STOPS));
      const result = parseConfig({ gradientStops: [...kept, { color: 'nope', position: 999, opacity: -1 }] });
      expect(result.config.gradientStops).toEqual(kept);
      expectSingleIssueFor(result.issues, 'gradientStops');
    });

    it('falls back the whole list when a bad stop sits inside the first 12 of an over-long list', () => {
      const stops: unknown[] = Array.from({ length: MAX_GRADIENT_STOPS + 1 }, (_, i) =>
        stopAt((i * 100) / MAX_GRADIENT_STOPS),
      );
      stops[3] = { color: 'nope', position: 50, opacity: 100 };
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops).toEqual(DEFAULT_CONFIG.gradientStops);
      expectSingleIssueFor(result.issues, 'gradientStops');
    });

    it('treats an own key holding undefined as present but invalid', () => {
      const result = parseConfig({ shape: undefined });
      expect(result.config.shape).toBe(DEFAULT_CONFIG.shape);
      expectSingleIssueFor(result.issues, 'shape');
    });

    it.each<[string, unknown]>([
      ['not an array', 'nope'],
      ['an object', {}],
      ['null', null],
      ['a number', 5],
    ])('falls back to the default stops when the value is %s', (_name, value) => {
      const result = parseConfig({ gradientStops: value });
      expect(result.config.gradientStops).toEqual(DEFAULT_CONFIG.gradientStops);
      expectSingleIssueFor(result.issues, 'gradientStops');
    });

    it.each<[string, unknown]>([
      ['a bad color', [stopAt(0), { color: 'nope', position: 100, opacity: 80 }]],
      ['position below range', [stopAt(0), { color: '#123456', position: -1, opacity: 80 }]],
      ['position above range', [stopAt(0), { color: '#123456', position: 101, opacity: 80 }]],
      ['opacity below range', [stopAt(0), { color: '#123456', position: 100, opacity: -1 }]],
      ['opacity above range', [stopAt(0), { color: '#123456', position: 100, opacity: 101 }]],
      ['a missing color', [stopAt(0), { position: 100, opacity: 80 }]],
      ['a non-numeric position', [stopAt(0), { color: '#123456', position: '50', opacity: 80 }]],
      ['a non-object stop', [stopAt(0), 'nope']],
    ])('falls back the whole list for %s', (_name, stops) => {
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops).toEqual(DEFAULT_CONFIG.gradientStops);
      expectSingleIssueFor(result.issues, 'gradientStops');
    });

    it('accepts stop position/opacity at both boundaries (0 and 100)', () => {
      const stops = [
        { color: '#123456', position: 0, opacity: 0 },
        { color: '#654321', position: 100, opacity: 100 },
      ];
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops).toEqual(stops);
      expect(result.issues).toEqual([]);
    });

    it('falls back the whole list when a stop is just outside the position/opacity boundaries', () => {
      const justBelow = [stopAt(0), { color: '#123456', position: 100, opacity: -0.0001 }];
      const justAbove = [stopAt(0), { color: '#123456', position: 100.0001, opacity: 80 }];
      for (const bad of [justBelow, justAbove]) {
        const result = parseConfig({ gradientStops: bad });
        expect(result.config.gradientStops).toEqual(DEFAULT_CONFIG.gradientStops);
        expectSingleIssueFor(result.issues, 'gradientStops');
      }
    });

    it('normalises stop colors to the same form as normalizeHex', () => {
      const stops = [
        { color: '#ABC', position: 0, opacity: 100 },
        { color: 'def012', position: 100, opacity: 100 },
      ];
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops[0].color).toBe(normalizeHex('#ABC'));
      expect(result.config.gradientStops[1].color).toBe(normalizeHex('def012'));
      expect(result.issues).toEqual([]);
    });

    it('drops extra keys inside a stop', () => {
      const stops = [
        { color: '#123456', position: 0, opacity: 80, extra: 'nope' },
        { color: '#654321', position: 100, opacity: 80 },
      ];
      const result = parseConfig({ gradientStops: stops });
      expect(result.config.gradientStops[0]).toEqual({ color: '#123456', position: 0, opacity: 80 });
      expect(result.issues).toEqual([]);
    });

    it('is silently defaulted when missing', () => {
      const result = parseConfig({});
      expect(result.config.gradientStops).toEqual(DEFAULT_CONFIG.gradientStops);
      expect(result.issues).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// serializeConfigDocument
// ---------------------------------------------------------------------------

describe('serializeConfigDocument', () => {
  it('outputs 2-space indented JSON with a trailing newline, keys version/name/config', () => {
    const out = serializeConfigDocument('nine_patch', DEFAULT_CONFIG);
    expect(out.endsWith('\n')).toBe(true);
    expect(out).toBe(
      `${JSON.stringify({ version: CONFIG_VERSION, name: 'nine_patch', config: DEFAULT_CONFIG }, null, 2)}\n`,
    );
    expect(Object.keys(JSON.parse(out))).toEqual(['version', 'name', 'config']);
  });

  it('orders config keys following DEFAULT_CONFIG regardless of the input object’s own key order', () => {
    const reversedKeys = [...Object.keys(DEFAULT_CONFIG)].reverse();
    const reordered = {} as Record<string, unknown>;
    for (const k of reversedKeys) reordered[k] = (DEFAULT_CONFIG as unknown as Record<string, unknown>)[k];

    const out = serializeConfigDocument('nine_patch', reordered as unknown as NinePatchConfig);
    const parsed = JSON.parse(out);
    expect(Object.keys(parsed.config)).toEqual(Object.keys(DEFAULT_CONFIG));
  });

  it('orders region keys as x, y, w, h regardless of the input order', () => {
    const reorderedRegion: Region = { h: 4, w: 3, y: 2, x: 1 };
    const cfg: NinePatchConfig = { ...DEFAULT_CONFIG, stretch: reorderedRegion };
    const out = serializeConfigDocument('nine_patch', cfg);
    const parsed = JSON.parse(out);
    expect(Object.keys(parsed.config.stretch)).toEqual(['x', 'y', 'w', 'h']);
  });

  it('orders stop keys as color, position, opacity regardless of the input order', () => {
    const reorderedStop: GradientStop = { opacity: 90, position: 10, color: '#123456' };
    const cfg: NinePatchConfig = { ...DEFAULT_CONFIG, gradientStops: [reorderedStop, DEFAULT_CONFIG.gradientStops[1]] };
    const out = serializeConfigDocument('nine_patch', cfg);
    const parsed = JSON.parse(out);
    expect(Object.keys(parsed.config.gradientStops[0])).toEqual(['color', 'position', 'opacity']);
  });

  it('writes the full config, not only the changed fields', () => {
    const custom: NinePatchConfig = { ...DEFAULT_CONFIG, shape: 'pill' };
    const out = serializeConfigDocument('nine_patch', custom);
    const parsed = JSON.parse(out);
    expect(Object.keys(parsed.config)).toEqual(Object.keys(DEFAULT_CONFIG));
    expect(parsed.config.shape).toBe('pill');
  });

  it('is byte identical for the same input', () => {
    const a = serializeConfigDocument('nine_patch', DEFAULT_CONFIG);
    const b = serializeConfigDocument('nine_patch', DEFAULT_CONFIG);
    expect(a).toBe(b);
  });

  it('round trips unicode in the name', () => {
    const out = serializeConfigDocument('日本語_ファイル 🎉', DEFAULT_CONFIG);
    const parsed = JSON.parse(out);
    expect(parsed.name).toBe('日本語_ファイル 🎉');
  });
});

// ---------------------------------------------------------------------------
// parseConfigDocument
// ---------------------------------------------------------------------------

describe('parseConfigDocument', () => {
  it('accepts a JSON string produced by serializeConfigDocument', () => {
    const json = serializeConfigDocument('my-preset', DEFAULT_CONFIG);
    const result = parseConfigDocument(json);
    expect(result.name).toBe('my-preset');
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.issues).toEqual([]);
  });

  it('accepts an already parsed document value', () => {
    const result = parseConfigDocument({ version: CONFIG_VERSION, name: 'my-preset', config: DEFAULT_CONFIG });
    expect(result.name).toBe('my-preset');
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.issues).toEqual([]);
  });

  it('never throws and gives defaults + one issue for a string that is not valid JSON', () => {
    expect(() => parseConfigDocument('{not valid json')).not.toThrow();
    const result = parseConfigDocument('{not valid json');
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.name).toBe(DEFAULT_FILE_NAME);
    expect(result.issues).toHaveLength(1);
  });

  it('treats an object with a config key as a document', () => {
    const result = parseConfigDocument({ config: { shape: 'pill' } });
    expect(result.name).toBe(DEFAULT_FILE_NAME);
    expect(result.config.shape).toBe('pill');
    expect(result.issues).toEqual([]);
  });

  it.each<[string, unknown]>([
    ['a bare config object', { shape: 'pill' }],
    ['a primitive', 42],
    ['null', null],
    ['an array', [1, 2, 3]],
  ])('treats %s with no config key as a bare config, matching parseConfig', (_name, value) => {
    const result = parseConfigDocument(value);
    expect(result.name).toBe(DEFAULT_FILE_NAME);
    const expected = parseConfig(value);
    expect(result.config).toEqual(expected.config);
    expect(result.issues).toEqual(expected.issues);
  });

  describe('name', () => {
    it('is silently defaulted when missing', () => {
      const result = parseConfigDocument({ config: DEFAULT_CONFIG });
      expect(result.name).toBe(DEFAULT_FILE_NAME);
      expect(result.issues).toEqual([]);
    });

    it('adds an issue starting with "name" when not a string', () => {
      const result = parseConfigDocument({ name: 123, config: DEFAULT_CONFIG });
      expect(result.name).toBe(DEFAULT_FILE_NAME);
      expectSingleIssueFor(result.issues, 'name');
    });

    it.each(['', '   '])('silently falls back to DEFAULT_FILE_NAME when empty after trim (%j)', (name) => {
      const result = parseConfigDocument({ name, config: DEFAULT_CONFIG });
      expect(result.name).toBe(DEFAULT_FILE_NAME);
      expect(result.issues).toEqual([]);
    });

    it('keeps surrounding whitespace of a non-empty name', () => {
      expect(parseConfigDocument({ name: '  a  ', config: DEFAULT_CONFIG }).name).toBe('  a  ');
    });

    it('is not sanitised (sanitizeFileName is the app’s job)', () => {
      const result = parseConfigDocument({ name: 'a/b:c*weird name', config: DEFAULT_CONFIG });
      expect(result.name).toBe('a/b:c*weird name');
    });

    it('preserves unicode', () => {
      const result = parseConfigDocument({ name: '日本語 🎨', config: DEFAULT_CONFIG });
      expect(result.name).toBe('日本語 🎨');
    });
  });

  describe('version', () => {
    it('is silently defaulted when missing', () => {
      const result = parseConfigDocument({ name: 'x', config: DEFAULT_CONFIG });
      expect(result.issues).toEqual([]);
    });

    it('is silent when equal to CONFIG_VERSION', () => {
      const result = parseConfigDocument({ version: CONFIG_VERSION, name: 'x', config: DEFAULT_CONFIG });
      expect(result.issues).toEqual([]);
    });

    it.each<[string, unknown]>([
      ['higher than CONFIG_VERSION', CONFIG_VERSION + 1],
      ['lower than CONFIG_VERSION', CONFIG_VERSION - 1],
      ['a non-integer', 1.5],
      ['a numeric string', String(CONFIG_VERSION)],
      ['null', null],
    ])('adds one issue and still parses the config on a best-effort basis for %s', (_name, version) => {
      const result = parseConfigDocument({ version, name: 'x', config: { shape: 'pill' } });
      expectSingleIssueFor(result.issues, 'version');
      expect(result.config.shape).toBe('pill');
    });
  });
});

// ---------------------------------------------------------------------------
// URL encoding: encodeConfig / decodeConfig
// ---------------------------------------------------------------------------

describe('encodeConfig', () => {
  it('is the empty string for a config equal to DEFAULT_CONFIG', () => {
    expect(encodeConfig(DEFAULT_CONFIG)).toBe('');
  });

  it('is the empty string even when regions/stops are deep-equal copies, not the same reference', () => {
    const config: NinePatchConfig = {
      ...DEFAULT_CONFIG,
      stretch: { ...DEFAULT_CONFIG.stretch },
      content: { ...DEFAULT_CONFIG.content },
      gradientStops: DEFAULT_CONFIG.gradientStops.map((s) => ({ ...s })),
    };
    expect(encodeConfig(config)).toBe('');
  });

  it('writes only the top-level fields that differ from DEFAULT_CONFIG', () => {
    const config: NinePatchConfig = { ...DEFAULT_CONFIG, contentWidth: 999 };
    const encoded = encodeConfig(config);
    const json = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    expect(json).toEqual({ contentWidth: 999 });
  });

  it('writes a changed region using a deep comparison', () => {
    const config: NinePatchConfig = { ...DEFAULT_CONFIG, stretch: { x: 1, y: 0, w: 0, h: 0 } };
    const encoded = encodeConfig(config);
    const json = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    expect(json).toEqual({ stretch: { x: 1, y: 0, w: 0, h: 0 } });
  });

  it('produces only base64url alphabet characters (A-Z a-z 0-9 - _), no padding', () => {
    const config: NinePatchConfig = {
      ...DEFAULT_CONFIG,
      shape: 'ellipse',
      contentWidth: 1500,
      fillColor: '#abcdef',
      fillType: 'gradient',
    };
    const encoded = encodeConfig(config);
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
    expect(encoded).not.toContain('=');
  });
});

describe('decodeConfig', () => {
  it('returns the defaults with no issues for the empty string', () => {
    const result = decodeConfig('');
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.issues).toEqual([]);
  });

  it('rejects an encoded string one character over MAX_ENCODED_LENGTH', () => {
    const tooLong = 'A'.repeat(MAX_ENCODED_LENGTH + 1);
    const result = decodeConfig(tooLong);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.issues).toHaveLength(1);
  });

  it('accepts a validly-encoded string exactly at MAX_ENCODED_LENGTH', () => {
    // MAX_ENCODED_LENGTH (8192) is divisible by 4, so it is reachable as an exact,
    // padding-free base64url length: 8192 chars <=> 8192/4*3 = 6144 input bytes exactly.
    const targetBytes = (MAX_ENCODED_LENGTH / 4) * 3;
    const base = JSON.stringify({ contentWidth: 1234, pad: '' });
    const baseBytes = Buffer.byteLength(base, 'utf-8');
    const padLen = targetBytes - baseBytes;
    expect(padLen).toBeGreaterThan(0);
    const json = JSON.stringify({ contentWidth: 1234, pad: 'x'.repeat(padLen) });
    expect(Buffer.byteLength(json, 'utf-8')).toBe(targetBytes);

    const encoded = Buffer.from(json, 'utf-8').toString('base64url');
    expect(encoded.length).toBe(MAX_ENCODED_LENGTH);

    const result = decodeConfig(encoded);
    expect(result.config.contentWidth).toBe(1234);
    expect(result.issues).toEqual([]);
  });

  it.each<[string, string]>([
    ['a plus sign (base64, not base64url)', 'AAAA+AAA'],
    ['a slash', 'AAAA/AAA'],
    ['equals padding', 'AAAA===='],
    ['whitespace', 'AAAA AAA'],
    ['a non-ascii character', 'AAAA😀AAA'],
  ])('gives defaults and one issue for %s (outside the base64url alphabet)', (_name, value) => {
    const result = decodeConfig(value);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.issues).toHaveLength(1);
  });

  it('gives defaults and one issue for invalid UTF-8 bytes', () => {
    const invalidUtf8 = Buffer.from([0xff, 0xfe, 0xfd, 0xfc]).toString('base64url');
    const result = decodeConfig(invalidUtf8);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.issues).toHaveLength(1);
  });

  it('gives defaults and one issue for valid base64url/UTF-8 that is not valid JSON', () => {
    const encoded = Buffer.from('not { valid } json', 'utf-8').toString('base64url');
    const result = decodeConfig(encoded);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.issues).toHaveLength(1);
  });

  it('never throws for arbitrary strings', () => {
    for (const value of ['', ' ', '!!!', '\u0000', 'a'.repeat(20000), 'A_-9aZ']) {
      expect(() => decodeConfig(value)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Round trips (hand-built fixtures, not produced via parseConfig)
// ---------------------------------------------------------------------------

describe('round trips', () => {
  const customConfig: NinePatchConfig = {
    shape: 'pill',
    contentWidth: 240,
    contentHeight: 96,
    cornerRadius: 18,
    fillType: 'gradient',
    fillColor: '#112233',
    fillOpacity: 87,
    gradientStops: [
      { color: '#ff0000', position: 0, opacity: 100 },
      { color: '#00ff00', position: 40, opacity: 60 },
      { color: '#0000ff', position: 100, opacity: 30 },
    ],
    gradientAngle: 45,
    bgTransparent: false,
    backgroundColor: '#abcdef',
    borderWidth: 6,
    borderColor: '#654321',
    stretchEnabled: false,
    stretchAuto: false,
    stretch: { x: 4, y: 8, w: 120, h: 40 },
    contentEnabled: false,
    contentAuto: false,
    content: { x: 12, y: 16, w: 100, h: 50 },
  };

  const minBoundaryConfig: NinePatchConfig = {
    shape: 'rectangle',
    contentWidth: 1,
    contentHeight: 1,
    cornerRadius: 0,
    fillType: 'solid',
    fillColor: '#000000',
    fillOpacity: 0,
    gradientStops: [
      { color: '#000000', position: 0, opacity: 0 },
      { color: '#ffffff', position: 100, opacity: 0 },
    ],
    gradientAngle: 0,
    bgTransparent: true,
    backgroundColor: '#000000',
    borderWidth: 0,
    borderColor: '#000000',
    stretchEnabled: true,
    stretchAuto: true,
    stretch: { x: 0, y: 0, w: 0, h: 0 },
    contentEnabled: true,
    contentAuto: true,
    content: { x: 0, y: 0, w: 0, h: 0 },
  };

  const maxBoundaryConfig: NinePatchConfig = {
    shape: 'ellipse',
    contentWidth: MAX_CONTENT_SIZE,
    contentHeight: MAX_CONTENT_SIZE,
    cornerRadius: MAX_CONTENT_SIZE / 2,
    fillType: 'gradient',
    fillColor: '#ffffff',
    fillOpacity: 100,
    gradientStops: Array.from({ length: MAX_GRADIENT_STOPS }, (_, i) => ({
      color: i % 2 === 0 ? '#ffffff' : '#000000',
      position: (i * 100) / (MAX_GRADIENT_STOPS - 1),
      opacity: 100,
    })),
    gradientAngle: 360,
    bgTransparent: false,
    backgroundColor: '#ffffff',
    borderWidth: MAX_CONTENT_SIZE / 2,
    borderColor: '#ffffff',
    stretchEnabled: false,
    stretchAuto: false,
    stretch: { x: MAX_CONTENT_SIZE, y: MAX_CONTENT_SIZE, w: MAX_CONTENT_SIZE, h: MAX_CONTENT_SIZE },
    contentEnabled: false,
    contentAuto: false,
    content: { x: MAX_CONTENT_SIZE, y: MAX_CONTENT_SIZE, w: MAX_CONTENT_SIZE, h: MAX_CONTENT_SIZE },
  };

  const fixtures: Array<[string, NinePatchConfig]> = [
    ['DEFAULT_CONFIG', DEFAULT_CONFIG],
    ['a fully customised config', customConfig],
    ['every field at its minimum boundary', minBoundaryConfig],
    ['every field at its maximum boundary', maxBoundaryConfig],
  ];

  it.each(fixtures)('encodeConfig/decodeConfig round trips %s', (_name, config) => {
    const encoded = encodeConfig(config);
    const decoded = decodeConfig(encoded);
    expect(decoded.config).toEqual(config);
    expect(decoded.issues).toEqual([]);
  });

  it.each(fixtures)('serializeConfigDocument/parseConfigDocument round trips %s', (_name, config) => {
    const doc = serializeConfigDocument('preset', config);
    const parsed = parseConfigDocument(doc);
    expect(parsed.config).toEqual(config);
    expect(parsed.issues).toEqual([]);
    expect(parsed.name).toBe('preset');
  });

  it('round trips unicode in the document name alongside a custom config', () => {
    const doc = serializeConfigDocument('名前 🎨 with spaces', customConfig);
    const parsed = parseConfigDocument(doc);
    expect(parsed.name).toBe('名前 🎨 with spaces');
    expect(parsed.config).toEqual(customConfig);
    expect(parsed.issues).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Seeded fuzz test
// ---------------------------------------------------------------------------

/** mulberry32: a small, fast, deterministic PRNG. Same seed => same sequence, every run. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randomString(rand: () => number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(32 + Math.floor(rand() * 95));
  return s;
}

const GARBAGE_VALUES: readonly unknown[] = [
  null,
  undefined,
  NaN,
  Infinity,
  -Infinity,
  '',
  'garbage',
  0,
  -1,
  1e300,
  true,
  false,
  [],
  {},
  [1, 2, 3],
  { a: 1 },
];

const GARBAGE_KEYS = [
  'shape',
  'fillType',
  'contentWidth',
  'contentHeight',
  'cornerRadius',
  'gradientStops',
  'stretch',
  'content',
  'fillColor',
  'foo',
  'bar',
  'x',
  'y',
  'w',
  'h',
  'color',
  'position',
  'opacity',
];

/** Random JSON-ish garbage: primitives, arrays and objects nested a few levels deep. */
function randomGarbage(rand: () => number, depth = 0): unknown {
  const kind = depth > 2 ? 0 : Math.floor(rand() * 5);
  switch (kind) {
    case 0:
      return pick(rand, GARBAGE_VALUES);
    case 1: {
      const len = Math.floor(rand() * 4);
      return Array.from({ length: len }, () => randomGarbage(rand, depth + 1));
    }
    case 2: {
      const obj: Record<string, unknown> = {};
      const len = Math.floor(rand() * 4);
      for (let i = 0; i < len; i++) obj[pick(rand, GARBAGE_KEYS)] = randomGarbage(rand, depth + 1);
      return obj;
    }
    case 3:
      return rand() * 2e6 - 1e6;
    default:
      return randomString(rand, Math.floor(rand() * 10));
  }
}

/** A structurally config-shaped object with a random subset of its fields corrupted. */
function randomValidLookingConfig(rand: () => number): unknown {
  const base: Record<string, unknown> = {
    shape: pick(rand, ['rounded', 'pill', 'ellipse', 'rectangle']),
    fillType: pick(rand, ['solid', 'gradient']),
    contentWidth: Math.floor(rand() * MAX_CONTENT_SIZE) + 1,
    contentHeight: Math.floor(rand() * MAX_CONTENT_SIZE) + 1,
    cornerRadius: rand() * (MAX_CONTENT_SIZE / 2),
    borderWidth: rand() * (MAX_CONTENT_SIZE / 2),
    fillOpacity: rand() * 100,
    gradientAngle: rand() * 360,
    fillColor: '#4caf50',
    backgroundColor: '#000000',
    borderColor: '#000000',
    bgTransparent: rand() < 0.5,
    stretchEnabled: rand() < 0.5,
    stretchAuto: rand() < 0.5,
    contentEnabled: rand() < 0.5,
    contentAuto: rand() < 0.5,
    stretch: { x: 0, y: 0, w: 10, h: 10 },
    content: { x: 0, y: 0, w: 10, h: 10 },
    gradientStops: [
      { color: '#ff0000', position: 0, opacity: 100 },
      { color: '#0000ff', position: 100, opacity: 100 },
    ],
  };

  const keys = Object.keys(base);
  const corruptCount = Math.floor(rand() * 4);
  for (let i = 0; i < corruptCount; i++) {
    base[pick(rand, keys)] = pick(rand, GARBAGE_VALUES);
  }

  if (rand() < 0.3 && typeof base.stretch === 'object' && base.stretch !== null) {
    (base.stretch as Record<string, unknown>)[pick(rand, ['x', 'y', 'w', 'h'])] = pick(rand, GARBAGE_VALUES);
  }
  if (rand() < 0.3 && Array.isArray(base.gradientStops) && base.gradientStops.length > 0) {
    const stop = base.gradientStops[0] as Record<string, unknown>;
    stop[pick(rand, ['color', 'position', 'opacity'])] = pick(rand, GARBAGE_VALUES);
  }
  // Prototype-pollution-shaped keys, as *own* properties (mirrors what JSON.parse produces),
  // never via plain assignment (which would trigger the real __proto__ setter on `base` itself).
  if (rand() < 0.15) {
    Object.defineProperty(base, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true });
  }
  // Use a non-literal key so TS resolves these through the index signature (as `unknown`)
  // instead of the special-cased `constructor: Function` property every object type carries.
  const constructorKey: string = 'constructor';
  const prototypeKey: string = 'prototype';
  if (rand() < 0.15) base[constructorKey] = { prototype: { polluted2: true } };
  if (rand() < 0.15) base[prototypeKey] = { polluted3: true };

  return base;
}

const FUZZ_SEED = 0xc0ffee;
const FUZZ_ITERATIONS = 150;

function generateFuzzCases(): unknown[] {
  const rand = mulberry32(FUZZ_SEED);
  const cases: unknown[] = [];
  for (let i = 0; i < FUZZ_ITERATIONS; i++) cases.push(randomValidLookingConfig(rand));
  for (let i = 0; i < FUZZ_ITERATIONS; i++) cases.push(randomGarbage(rand));
  return cases;
}

// Generated once at module load, from a fixed seed, so the suite is fully deterministic.
const fuzzCases = generateFuzzCases();

function assertRobust(input: unknown, ctx: NinePatchContext) {
  const parsed = parseConfig(input);
  expect(isValidConfig(parsed.config)).toBe(true);
  resolveNinePatch(parsed.config);
  renderNinePatch(ctx, parsed.config);

  const doc = parseConfigDocument({ version: CONFIG_VERSION, name: 'fuzz', config: input });
  expect(isValidConfig(doc.config)).toBe(true);
  resolveNinePatch(doc.config);
  renderNinePatch(ctx, doc.config);

  const asString = typeof input === 'string' ? input : (JSON.stringify(input) ?? 'null');

  const rawDecoded = decodeConfig(asString);
  expect(isValidConfig(rawDecoded.config)).toBe(true);
  resolveNinePatch(rawDecoded.config);
  renderNinePatch(ctx, rawDecoded.config);

  const encoded = Buffer.from(asString, 'utf-8').toString('base64url');
  const decoded = decodeConfig(encoded);
  expect(isValidConfig(decoded.config)).toBe(true);
  resolveNinePatch(decoded.config);
  renderNinePatch(ctx, decoded.config);
}

describe(`seeded fuzz (mulberry32, seed 0x${FUZZ_SEED.toString(16)}, ${fuzzCases.length} cases)`, () => {
  const ctx = createStubContext();

  it.each(fuzzCases.map((input, i): [number, unknown] => [i, input]))(
    'case #%i never throws and always yields a valid, renderable config from parseConfig, parseConfigDocument and decodeConfig',
    (_i, input) => {
      assertRobust(input, ctx);
    },
  );
});
