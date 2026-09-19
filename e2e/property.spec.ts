import { expect, test, type Page } from '@playwright/test';
import { AppPage, type FillType, type Shape } from './support/app';
import {
  assertValidNinePatch,
  decodePng,
  readMarkers,
  type DecodedPng,
  type NinePatchMarkers as Markers,
  type Run,
} from './support/ninePatch';

// Seeded property test for the PNG export (independent of `src/`); see specs/property-test-export.md.
test.use({ colorScheme: 'light' });
const SEED = 0xc0ffee;
const CHUNK_COUNT = 6;
type Region = { x: number; y: number; w: number; h: number };
type GradientStop = { color: string; position: number; opacity: number };
const DEFAULT_CONFIG = {
  shape: 'rounded' as Shape,
  contentWidth: 64,
  contentHeight: 32,
  cornerRadius: 0,
  fillType: 'solid' as FillType,
  fillColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#000000',
  fillOpacity: 100,
  gradientStops: [
    { color: '#000000', position: 0, opacity: 100 },
    { color: '#ffffff', position: 100, opacity: 100 },
  ] as GradientStop[],
  gradientAngle: 90,
  bgTransparent: false,
  stretchEnabled: false,
  stretchAuto: false,
  contentEnabled: false,
  contentAuto: false,
  borderWidth: 0,
  stretch: { x: 0, y: 0, w: 0, h: 0 } as Region,
  content: { x: 0, y: 0, w: 0, h: 0 } as Region,
};
type Config = typeof DEFAULT_CONFIG;
type Case = { index: number; config: Config; family?: { id: number; shape: Shape } };
const baseConfig = (overrides: Partial<Config>): Config => ({ ...DEFAULT_CONFIG, ...overrides });
// PRNG and small draw helpers.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const randInt = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const pick = <T>(rng: Rng, options: readonly T[]): T => options[Math.floor(rng() * options.length)];
const randomHexColor = (rng: Rng): string => {
  const byte = () => (Math.floor(rng() * 256) + 0x100).toString(16).slice(1);
  return `#${byte()}${byte()}${byte()}`;
};
// Splits a flat number array into fixed-size tuples, so the tables below print as compact lists.
function chunkFlat(flat: number[], size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < flat.length; i += size) out.push(flat.slice(i, i + size));
  return out;
}

// Generator: 200 random cases, 5 fixed edge cases, 40 shape families x 4 shapes.
function randomSize(rng: Rng): { w: number; h: number } {
  const r = rng();
  if (r < 0.6) return { w: randInt(rng, 1, 96), h: randInt(rng, 1, 96) };
  if (r < 0.8) {
    const s = randInt(rng, 1, 96);
    return { w: s, h: s };
  }
  return { w: pick(rng, [1, 2, 3, 4, 5]), h: pick(rng, [1, 2, 3, 4, 5]) };
}
function randomCornerRadius(rng: Rng, w: number, h: number): number {
  const r = rng();
  const maxR = Math.floor(Math.min(w, h) / 2);
  if (r < 0.25) return 0;
  if (r < 0.5) return Math.max(0, maxR + pick(rng, [-1, 0, 5]));
  if (r < 0.8) return randInt(rng, 0, 48);
  return rng() * 48;
}
function randomOpacity(rng: Rng): number {
  const r = rng();
  return r < 0.2 ? 0 : r < 0.6 ? 100 : rng() * 100;
}
const randomStops = (rng: Rng): GradientStop[] =>
  Array.from({ length: randInt(rng, 2, 12) }, () => ({
    color: randomHexColor(rng),
    position: rng() * 100,
    opacity: randomOpacity(rng),
  }));
function randomBorderWidth(rng: Rng): number {
  const r = rng();
  return r < 0.5 ? 0 : r < 0.8 ? randInt(rng, 1, 4) : randInt(rng, 5, 60);
}
function randomRegion(rng: Rng, w: number, h: number): Region {
  if (rng() < 0.05) return { x: 2000, y: 2000, w: 2000, h: 2000 };
  return { x: randInt(rng, 0, w + 3), w: randInt(rng, 0, w + 3), y: randInt(rng, 0, h + 3), h: randInt(rng, 0, h + 3) };
}
const SHAPES: Shape[] = ['rounded', 'pill', 'ellipse', 'rectangle'];
function randomCase(rng: Rng): Config {
  const { w, h } = randomSize(rng);
  return baseConfig({
    shape: pick(rng, SHAPES),
    contentWidth: w,
    contentHeight: h,
    cornerRadius: randomCornerRadius(rng, w, h),
    fillType: rng() < 0.5 ? 'solid' : 'gradient',
    fillColor: randomHexColor(rng),
    backgroundColor: randomHexColor(rng),
    borderColor: randomHexColor(rng),
    fillOpacity: randomOpacity(rng),
    gradientStops: randomStops(rng),
    gradientAngle: rng() * 360,
    bgTransparent: rng() < 0.6,
    stretchEnabled: rng() < 0.5,
    stretchAuto: rng() < 0.5,
    contentEnabled: rng() < 0.5,
    contentAuto: rng() < 0.5,
    borderWidth: randomBorderWidth(rng),
    stretch: randomRegion(rng, w, h),
    content: randomRegion(rng, w, h),
  });
}
// Auto stretch + content, both enabled: shared by the fixed edge cases and every shape family.
const AUTO_REGIONS = { stretchEnabled: true, stretchAuto: true, contentEnabled: true, contentAuto: true };
const fixedEdgeCases = (): Config[] =>
  chunkFlat([1, 1, 2, 2, 1, 2000, 2000, 1, 300, 200], 2).map(([w, h]) =>
    baseConfig({ contentWidth: w, contentHeight: h, ...AUTO_REGIONS }),
  );
// Family variants: solid, solid + border, gradient (opacity/bgTransparent fixed so shape alone drives pixels).
const FAMILY_VARIANTS: Array<Partial<Config>> = [
  { fillType: 'solid', fillColor: '#4caf50' },
  { fillType: 'solid', fillColor: '#4caf50', borderWidth: 3, borderColor: '#ff0000' },
  {
    fillType: 'gradient',
    gradientStops: [
      { color: '#4caf50', position: 0, opacity: 100 },
      { color: '#2e7d32', position: 100, opacity: 100 },
    ],
    gradientAngle: 180,
  },
];
const familyBaseConfig = (w: number, h: number, radius: number, variant: number): Config =>
  baseConfig({
    contentWidth: w,
    contentHeight: h,
    cornerRadius: radius,
    fillOpacity: 100,
    bgTransparent: true,
    ...AUTO_REGIONS,
    ...FAMILY_VARIANTS[variant],
  });
const familyMembers = (base: Config): Config[] => SHAPES.map((shape) => ({ ...base, shape }));
const FIXED_FAMILY_ROWS = chunkFlat([64, 32, 0, 64, 32, 16, 65, 31, 20, 1, 9, 0, 16, 16, 8], 3);
const RANDOM_FAMILY_SIZES = chunkFlat(
  [2, 2, 3, 3, 4, 4, 5, 5, 8, 8, 33, 33, 64, 64, 2, 5, 7, 3, 3, 20, 10, 40, 32, 64, 96, 17, 64, 60],
  2,
);
function buildFamilies(rng: Rng): Config[][] {
  const fixed = FIXED_FAMILY_ROWS.flatMap(([w, h, radius]) =>
    [0, 1, 2].map((variant) => familyMembers(familyBaseConfig(w, h, radius, variant))),
  );
  const random = Array.from({ length: 25 }, () => {
    const [w, h] = pick(rng, RANDOM_FAMILY_SIZES);
    const maxR = Math.floor(Math.min(w, h) / 2);
    const radius = pick(rng, [0, 1, Math.max(0, maxR - 1), maxR, Math.max(0, maxR + 5)]);
    return familyMembers(familyBaseConfig(w, h, radius, randInt(rng, 0, 2)));
  });
  return [...fixed, ...random];
}
function buildCases(rng: Rng): Case[] {
  const cases: Case[] = [];
  let i = 0;
  for (let n = 0; n < 200; n++) cases.push({ index: i++, config: randomCase(rng) });
  for (const config of fixedEdgeCases()) cases.push({ index: i++, config });
  buildFamilies(rng).forEach((family, familyId) => {
    for (const config of family) cases.push({ index: i++, config, family: { id: familyId, shape: config.shape } });
  });
  return cases;
}
// Splits `cases` into `count` chunks without splitting a family (rows 10/11 compare its members).
function chunkCases(cases: Case[], count: number): Case[][] {
  const chunks: Case[][] = Array.from({ length: count }, () => []);
  const target = cases.length / count;
  let idx = 0;
  for (let i = 0; i < cases.length;) {
    if (idx < count - 1 && chunks[idx].length >= target) idx++;
    const id = cases[i].family?.id;
    do chunks[idx].push(cases[i++]);
    while (id !== undefined && i < cases.length && cases[i].family?.id === id);
  }
  return chunks;
}
const ALL_CASES = buildCases(mulberry32(SEED));
const CHUNKS = chunkCases(ALL_CASES, CHUNK_COUNT);
// Shared assertion helpers.
const ctx = (index: number, config: Config): string => `seed=${SEED} index=${index} config=${JSON.stringify(config)}`;
function assertValid(png: DecodedPng, message: string): void {
  try {
    assertValidNinePatch(png);
  } catch (err) {
    throw Object.assign(new Error(`${(err as Error).message} (${message})`), { cause: err });
  }
}
async function setHash(page: Page, config: Config): Promise<void> {
  const hash = `#c=${Buffer.from(JSON.stringify(config)).toString('base64url')}`;
  await page.evaluate((h) => (window.location.hash = h), hash);
}
// Done signal (canvas size) only moves when size changes; same-size cases go through a spacer first.
async function show(page: Page, app: AppPage, config: Config): Promise<void> {
  const w = config.contentWidth + 2;
  const h = config.contentHeight + 2;
  const current = await app.canvasSize();
  if (current.width === w && current.height === h) {
    await setHash(page, { ...config, contentWidth: config.contentWidth + 1, contentHeight: config.contentHeight + 1 });
    await expect(app.canvas).toHaveJSProperty('width', w + 1);
    await expect(app.canvas).toHaveJSProperty('height', h + 1);
  }
  await setHash(page, config);
  await expect(app.canvas).toHaveJSProperty('width', w);
  await expect(app.canvas).toHaveJSProperty('height', h);
}
async function readCanvasPng(app: AppPage): Promise<DecodedPng> {
  const dataUrl = await app.canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL('image/png'));
  return decodePng(Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}
// The `W` by `H` artwork block at offset (1, 1), excluding the 1px frame ring (rows 10/11).
function extractArtwork(png: DecodedPng, w: number, h: number): Buffer {
  const rowBytes = w * 4;
  const out = Buffer.alloc(rowBytes * h);
  for (let y = 0; y < h; y++) {
    const srcStart = ((y + 1) * png.width + 1) * 4;
    png.data.copy(out, y * rowBytes, srcStart, srcStart + rowBytes);
  }
  return out;
}
function assertManualRun(actual: Run[], pos: number, size: number, axisSize: number, message: string): void {
  const x0 = Math.min(pos, axisSize);
  const len = Math.min(size, axisSize - x0);
  expect(actual, message).toEqual(len === 0 ? [] : [{ start: 1 + x0, end: x0 + len }]);
}
// Row 7 requires exactly one auto run; row 8 allows zero (a fully rounded shape may have none).
function checkAutoRun(run: Run[], axis: number, requireOne: boolean, message: string): void {
  expect(run.length, message)[requireOne ? 'toBe' : 'toBeLessThanOrEqual'](1);
  if (run.length === 1) {
    expect(run[0].start, message).toBeGreaterThanOrEqual(1);
    expect(run[0].end, message).toBeLessThanOrEqual(axis);
  }
}
// Rows 4-8: manual/auto/disabled markers for the stretch (top/left) and content (bottom/right) regions.
function checkRegionMarkers(kind: 'stretch' | 'content', config: Config, markers: Markers, message: string): void {
  const { contentWidth: W, contentHeight: H } = config;
  const enabled = kind === 'stretch' ? config.stretchEnabled : config.contentEnabled;
  const auto = kind === 'stretch' ? config.stretchAuto : config.contentAuto;
  const region = kind === 'stretch' ? config.stretch : config.content;
  const [primary, secondary] = kind === 'stretch' ? [markers.top, markers.left] : [markers.bottom, markers.right];
  if (!enabled) {
    expect(primary, message).toEqual([]);
    expect(secondary, message).toEqual([]);
    return;
  }
  if (auto) {
    checkAutoRun(primary, W, kind === 'stretch', message);
    checkAutoRun(secondary, H, kind === 'stretch', message);
    return;
  }
  assertManualRun(primary, region.x, region.w, W, message);
  assertManualRun(secondary, region.y, region.h, H, message);
}
type IdentityRule = 'must-equal' | 'may-equal' | 'must-differ';
// Known identity states: pairs required/allowed to render equal artwork; else must differ (row 10).
// Row 11 checks must-equal; may-equal (e.g. square pill/ellipse) is browser dependent, asserted neither way.
function identityRule(a: Shape, b: Shape, w: number, h: number, r: number): IdentityRule {
  const maxR = Math.floor(Math.min(w, h) / 2);
  const has = (x: Shape, y: Shape) => (a === x && b === y) || (a === y && b === x);
  if (has('rounded', 'rectangle') && (r === 0 || maxR === 0)) return 'must-equal';
  if (has('rounded', 'pill') && r >= maxR) return 'must-equal';
  if (has('pill', 'rectangle') && maxR === 0) return 'must-equal';
  if (has('pill', 'ellipse') && w === h) return 'may-equal';
  if (has('rounded', 'ellipse') && w === h && r >= maxR) return 'may-equal';
  return 'must-differ';
}
type Pair = [Shape, Shape];
const SHAPE_PAIRS: Pair[] = SHAPES.flatMap((a, i) => SHAPES.slice(i + 1).map((b): Pair => [a, b]));

CHUNKS.forEach((chunk, chunkIndex) => {
  test(`export properties, seed ${SEED}, chunk ${chunkIndex + 1} of ${CHUNK_COUNT}`, async ({ page }) => {
    test.setTimeout(120_000);
    const app = new AppPage(page);
    await app.goto();
    let lastPng!: DecodedPng;
    const familyPixels = new Map<string, { buffer: Buffer; index: number; config: Config }>();
    for (const c of chunk) {
      const { config, index } = c;
      const message = ctx(index, config);
      const { contentWidth: W, contentHeight: H } = config;
      await show(page, app, config);
      const png = await readCanvasPng(app);
      lastPng = png;
      expect({ width: png.width, height: png.height }, message).toEqual({ width: W + 2, height: H + 2 }); // row 1
      assertValid(png, message); // row 2
      await expect(app.notice, message).toBeHidden(); // row 3
      const markers = readMarkers(png);
      checkRegionMarkers('stretch', config, markers, message); // rows 4, 6, 7
      checkRegionMarkers('content', config, markers, message); // rows 5, 6, 8
      const hint = page.getByText('At equal width and height a pill is a circle', { exact: false });
      const wantHint = config.shape === 'pill' && W === H;
      await expect(hint, message)[wantHint ? 'toBeVisible' : 'toBeHidden'](); // row 9
      if (c.family)
        familyPixels.set(`${c.family.id}:${c.family.shape}`, { buffer: extractArtwork(png, W, H), index, config });
    }
    const lastCase = chunk[chunk.length - 1];
    const downloaded = await app.downloadNinePatch();
    const lastMessage = ctx(lastCase.index, lastCase.config);
    expect(downloaded.png.width, lastMessage).toBe(lastPng.width); // row 12
    expect(downloaded.png.height, lastMessage).toBe(lastPng.height);
    expect(downloaded.png.data.equals(lastPng.data), lastMessage).toBe(true);
    const familyIds = new Set([...familyPixels.keys()].map((key) => Number(key.split(':')[0]))); // rows 10, 11
    for (const id of familyIds) {
      for (const [a, b] of SHAPE_PAIRS) {
        const entryA = familyPixels.get(`${id}:${a}`);
        const entryB = familyPixels.get(`${id}:${b}`);
        if (!entryA || !entryB) throw new Error(`family ${id} is split across chunks, ${a}/${b} cannot be compared`);
        const { contentWidth: w, contentHeight: h, cornerRadius: r } = entryA.config;
        const rule = identityRule(a, b, w, h, r);
        if (rule === 'may-equal') continue;
        const pairMessage = `family ${id} pair ${a}/${b}: ${ctx(entryA.index, entryA.config)} vs ${ctx(entryB.index, entryB.config)}`;
        expect(entryA.buffer.equals(entryB.buffer), pairMessage).toBe(rule === 'must-equal');
      }
    }
  });
});
