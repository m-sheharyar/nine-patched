import { normalizeHex } from './color';
import { DEFAULT_CONFIG, DEFAULT_FILE_NAME } from './defaults';
import { MAX_CONTENT_SIZE } from './geometry';
import type { FillType, GradientStop, NinePatchConfig, Region, Shape } from './types';

export const CONFIG_VERSION = 1;
export const MAX_GRADIENT_STOPS = 12;
export const MIN_GRADIENT_STOPS = 2;
export const MAX_ENCODED_LENGTH = 8192;

export interface ParseResult {
  config: NinePatchConfig;
  issues: string[];
}

export interface ConfigDocument {
  version: number;
  name: string;
  config: NinePatchConfig;
}

export interface ParsedDocument {
  name: string;
  config: NinePatchConfig;
  issues: string[];
}

const SHAPES: readonly Shape[] = ['rounded', 'pill', 'ellipse', 'rectangle'];
const FILL_TYPES: readonly FillType[] = ['solid', 'gradient'];
const MAX_RADIUS = MAX_CONTENT_SIZE / 2;
const CONFIG_KEYS = Object.keys(DEFAULT_CONFIG) as (keyof NinePatchConfig)[];

type Props = Record<string, unknown>;

const hasOwn = (source: Props, key: string) => Object.prototype.hasOwnProperty.call(source, key);

const isRecord = (value: unknown): value is Props =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A prototype-free copy of the own enumerable properties, so every later read is an own read and
 * `__proto__` / `constructor` are inert data keys that no lookup below ever asks for.
 */
function ownProps(value: Props): Props {
  const out: Props = Object.create(null);
  for (const key of Object.keys(value)) out[key] = value[key];
  return out;
}

function defaultConfig(): NinePatchConfig {
  return {
    ...DEFAULT_CONFIG,
    gradientStops: DEFAULT_CONFIG.gradientStops.map((s) => ({ ...s })),
    stretch: { ...DEFAULT_CONFIG.stretch },
    content: { ...DEFAULT_CONFIG.content },
  };
}

type Coerce<T> = (value: unknown) => T | null;

const oneOf =
  <T extends string>(allowed: readonly T[]): Coerce<T> =>
  (value) =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;

const integerIn =
  (min: number, max: number): Coerce<number> =>
  (value) =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;

const numberIn =
  (min: number, max: number): Coerce<number> =>
  (value) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;

const asBoolean: Coerce<boolean> = (value) => (typeof value === 'boolean' ? value : null);

const asHex: Coerce<string> = (value) => (typeof value === 'string' ? normalizeHex(value) : null);

const coordinate = integerIn(0, MAX_CONTENT_SIZE);
const asPercent = numberIn(0, 100);

const asRegion: Coerce<Region> = (value) => {
  if (!isRecord(value)) return null;
  const r = ownProps(value);
  const x = coordinate(r['x']);
  const y = coordinate(r['y']);
  const w = coordinate(r['w']);
  const h = coordinate(r['h']);
  if (x === null || y === null || w === null || h === null) return null;
  return { x, y, w, h };
};

const asStop: Coerce<GradientStop> = (value) => {
  if (!isRecord(value)) return null;
  const s = ownProps(value);
  const color = asHex(s['color']);
  const position = asPercent(s['position']);
  const opacity = asPercent(s['opacity']);
  if (color === null || position === null || opacity === null) return null;
  return { color, position, opacity };
};

const asShape = oneOf(SHAPES);
const asFillType = oneOf(FILL_TYPES);
const asSize = integerIn(1, MAX_CONTENT_SIZE);
const asRadius = numberIn(0, MAX_RADIUS);
const asAngle = numberIn(0, 360);

/** Issue wording, appended to `<field>: expected `. */
const EXPECTED = {
  shape: `one of ${SHAPES.join(', ')}`,
  fillType: `one of ${FILL_TYPES.join(', ')}`,
  size: `an integer from 1 to ${MAX_CONTENT_SIZE}`,
  radius: `a number from 0 to ${MAX_RADIUS}`,
  percent: 'a number from 0 to 100',
  angle: 'a number from 0 to 360',
  color: 'a hex color such as #4caf50',
  bool: 'a boolean',
  region: `an object with x, y, w and h, each an integer from 0 to ${MAX_CONTENT_SIZE}`,
};

/** A missing field keeps its default silently, so a URL can carry only the fields that changed. */
function readField<T>(
  source: Props,
  key: string,
  coerce: Coerce<T>,
  fallback: T,
  expected: string,
  issues: string[],
): T {
  if (!hasOwn(source, key)) return fallback;
  const value = coerce(source[key]);
  if (value === null) {
    issues.push(`${key}: expected ${expected}`);
    return fallback;
  }
  return value;
}

function readStops(source: Props, fallback: GradientStop[], issues: string[]): GradientStop[] {
  if (!hasOwn(source, 'gradientStops')) return fallback;
  const raw = source['gradientStops'];
  if (!Array.isArray(raw) || raw.length < MIN_GRADIENT_STOPS) {
    issues.push(`gradientStops: expected an array of at least ${MIN_GRADIENT_STOPS} stops`);
    return fallback;
  }
  const stops: GradientStop[] = [];
  for (const item of raw.slice(0, MAX_GRADIENT_STOPS)) {
    const parsed = asStop(item);
    if (parsed === null) {
      issues.push('gradientStops: expected each stop to be { color, position 0 to 100, opacity 0 to 100 }');
      return fallback;
    }
    stops.push(parsed);
  }
  if (raw.length > MAX_GRADIENT_STOPS) {
    issues.push(`gradientStops: expected at most ${MAX_GRADIENT_STOPS} stops, the extra stops were dropped`);
  }
  return stops;
}

/**
 * Coerce untrusted input (a URL, a dropped file, a CLI flag) into a renderable config. Never throws:
 * every field that is missing or unusable falls back to its default, and the caller gets the list of
 * fields it lost. The result shares no references with `DEFAULT_CONFIG` or with the input.
 */
export function parseConfig(input: unknown): ParseResult {
  const issues: string[] = [];
  const config = defaultConfig();
  if (!isRecord(input)) {
    issues.push('config: expected an object');
    return { config, issues };
  }

  const src = ownProps(input);
  const read = <T>(key: string, coerce: Coerce<T>, fallback: T, expected: string) =>
    readField(src, key, coerce, fallback, expected, issues);

  config.shape = read('shape', asShape, config.shape, EXPECTED.shape);
  config.contentWidth = read('contentWidth', asSize, config.contentWidth, EXPECTED.size);
  config.contentHeight = read('contentHeight', asSize, config.contentHeight, EXPECTED.size);
  config.cornerRadius = read('cornerRadius', asRadius, config.cornerRadius, EXPECTED.radius);
  config.fillType = read('fillType', asFillType, config.fillType, EXPECTED.fillType);
  config.fillColor = read('fillColor', asHex, config.fillColor, EXPECTED.color);
  config.fillOpacity = read('fillOpacity', asPercent, config.fillOpacity, EXPECTED.percent);
  config.gradientStops = readStops(src, config.gradientStops, issues);
  config.gradientAngle = read('gradientAngle', asAngle, config.gradientAngle, EXPECTED.angle);
  config.bgTransparent = read('bgTransparent', asBoolean, config.bgTransparent, EXPECTED.bool);
  config.backgroundColor = read('backgroundColor', asHex, config.backgroundColor, EXPECTED.color);
  config.borderWidth = read('borderWidth', asRadius, config.borderWidth, EXPECTED.radius);
  config.borderColor = read('borderColor', asHex, config.borderColor, EXPECTED.color);
  config.stretchEnabled = read('stretchEnabled', asBoolean, config.stretchEnabled, EXPECTED.bool);
  config.stretchAuto = read('stretchAuto', asBoolean, config.stretchAuto, EXPECTED.bool);
  config.stretch = read('stretch', asRegion, config.stretch, EXPECTED.region);
  config.contentEnabled = read('contentEnabled', asBoolean, config.contentEnabled, EXPECTED.bool);
  config.contentAuto = read('contentAuto', asBoolean, config.contentAuto, EXPECTED.bool);
  config.content = read('content', asRegion, config.content, EXPECTED.region);

  return { config, issues };
}

const orderedRegion = (r: Region): Region => ({ x: r.x, y: r.y, w: r.w, h: r.h });

const orderedStop = (s: GradientStop): GradientStop => ({ color: s.color, position: s.position, opacity: s.opacity });

/** The canonical key order of the file format: `DEFAULT_CONFIG` order, top level and inside a region. */
function orderedConfig(c: NinePatchConfig): NinePatchConfig {
  return {
    shape: c.shape,
    contentWidth: c.contentWidth,
    contentHeight: c.contentHeight,
    cornerRadius: c.cornerRadius,
    fillType: c.fillType,
    fillColor: c.fillColor,
    fillOpacity: c.fillOpacity,
    gradientStops: c.gradientStops.map(orderedStop),
    gradientAngle: c.gradientAngle,
    bgTransparent: c.bgTransparent,
    backgroundColor: c.backgroundColor,
    borderWidth: c.borderWidth,
    borderColor: c.borderColor,
    stretchEnabled: c.stretchEnabled,
    stretchAuto: c.stretchAuto,
    stretch: orderedRegion(c.stretch),
    contentEnabled: c.contentEnabled,
    contentAuto: c.contentAuto,
    content: orderedRegion(c.content),
  };
}

/** The `.json` file format, stable byte for byte so a saved file only changes when the config does. */
export function serializeConfigDocument(name: string, config: NinePatchConfig): string {
  const file: ConfigDocument = { version: CONFIG_VERSION, name, config: orderedConfig(config) };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Reads a document, a JSON string of one, or a bare config. Never throws. */
export function parseConfigDocument(input: unknown): ParsedDocument {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return { name: DEFAULT_FILE_NAME, config: defaultConfig(), issues: ['document: expected valid JSON'] };
    }
  }

  const doc = isRecord(value) ? ownProps(value) : null;
  if (doc === null || !hasOwn(doc, 'config')) {
    const bare = parseConfig(value);
    return { name: DEFAULT_FILE_NAME, config: bare.config, issues: bare.issues };
  }

  const issues: string[] = [];
  if (hasOwn(doc, 'version') && doc['version'] !== CONFIG_VERSION) {
    issues.push(`version: expected ${CONFIG_VERSION}, reading it as best we can`);
  }

  let name = DEFAULT_FILE_NAME;
  const rawName = doc['name'];
  if (typeof rawName === 'string') {
    if (rawName.trim().length > 0) name = rawName;
  } else if (hasOwn(doc, 'name')) {
    issues.push('name: expected a string');
  }

  const parsed = parseConfig(doc['config']);
  return { name, config: parsed.config, issues: [...issues, ...parsed.issues] };
}

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = '';
  let acc = 0;
  let bits = 0;
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += BASE64URL[(acc >> bits) & 63];
    }
  }
  if (bits > 0) out += BASE64URL[(acc << (6 - bits)) & 63];
  return out;
}

/** Null when the input holds a character outside the base64url alphabet. */
function base64urlDecode(encoded: string): Uint8Array | null {
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const char of encoded) {
    const value = BASE64URL.indexOf(char);
    if (value < 0) return null;
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}

const regionKey = (r: Region) => `${r.x},${r.y},${r.w},${r.h}`;
const stopsKey = (stops: GradientStop[]) => stops.map((s) => `${s.color},${s.position},${s.opacity}`).join('|');

function matchesDefault(config: NinePatchConfig, key: keyof NinePatchConfig): boolean {
  if (key === 'gradientStops') return stopsKey(config.gradientStops) === stopsKey(DEFAULT_CONFIG.gradientStops);
  if (key === 'stretch' || key === 'content') return regionKey(config[key]) === regionKey(DEFAULT_CONFIG[key]);
  return config[key] === DEFAULT_CONFIG[key];
}

/** Only the fields that differ from the defaults, so a shared URL stays short. Defaults give ''. */
export function encodeConfig(config: NinePatchConfig): string {
  const ordered = orderedConfig(config);
  const diff: Props = {};
  let changed = false;
  for (const key of CONFIG_KEYS) {
    if (matchesDefault(config, key)) continue;
    diff[key] = ordered[key];
    changed = true;
  }
  if (!changed) return '';
  return base64urlEncode(JSON.stringify(diff));
}

const UTF8 = new TextDecoder('utf-8', { fatal: true });

const decodeFailure = (issue: string): ParseResult => ({ config: defaultConfig(), issues: [issue] });

/** The inverse of `encodeConfig`. Never throws, whatever a URL happens to carry. */
export function decodeConfig(encoded: string): ParseResult {
  if (typeof encoded !== 'string' || encoded.length > MAX_ENCODED_LENGTH) {
    return decodeFailure(`config: expected a base64url string of at most ${MAX_ENCODED_LENGTH} characters`);
  }
  if (encoded === '') return { config: defaultConfig(), issues: [] };

  const bytes = base64urlDecode(encoded);
  if (bytes === null) return decodeFailure('config: expected base64url characters only');

  let json: string;
  try {
    json = UTF8.decode(bytes);
  } catch {
    return decodeFailure('config: expected valid UTF-8');
  }

  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    return decodeFailure('config: expected valid JSON');
  }
  return parseConfig(value);
}
