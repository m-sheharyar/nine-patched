import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';
import { assertValidNinePatch, getPixel } from './support/ninePatch';

test.use({ colorScheme: 'light' });

test.describe('solid fill', () => {
  test('centre pixel matches the exact fill colour at full opacity', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFillColor('#3366cc');
    await app.setFillOpacity(100);

    const { png } = await app.downloadNinePatch();
    expect(getPixel(png, 41, 41)).toEqual({ r: 0x33, g: 0x66, b: 0xcc, a: 255 });
  });

  test('50% opacity halves the alpha channel and keeps the colour close to exact', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFillColor('#3366cc');
    await app.setFillOpacity(50);

    const { png } = await app.downloadNinePatch();
    const pixel = getPixel(png, 41, 41);
    // Canvas composites via premultiplied alpha internally, so unpremultiplying a 50%-alpha
    // fill back to straight RGBA can be off by 1 per channel — not an app bug.
    expect(pixel.r).toBeGreaterThanOrEqual(0x32);
    expect(pixel.r).toBeLessThanOrEqual(0x34);
    expect(pixel.g).toBeGreaterThanOrEqual(0x65);
    expect(pixel.g).toBeLessThanOrEqual(0x67);
    expect(pixel.b).toBeGreaterThanOrEqual(0xcb);
    expect(pixel.b).toBeLessThanOrEqual(0xcd);
    expect([127, 128]).toContain(pixel.a);
  });
});

test.describe('solid background', () => {
  test('the content corner takes the background colour while the frame stays valid', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setBackground({ transparent: false, color: '#112233' });

    const { png } = await app.downloadNinePatch();
    expect(() => assertValidNinePatch(png)).not.toThrow();
    // (1,1) is outside the default rounded shape's fill but inside the background rect.
    expect(getPixel(png, 1, 1)).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 255 });
  });
});

test.describe('border', () => {
  test('a border-band pixel is the border colour, the centre is the fill colour', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setShape('rectangle');
    await app.setSize(80, 80);
    await app.setFillColor('#0000ff');
    await app.setFillOpacity(100);
    await app.setBorder(4, '#ff0000');

    const { png } = await app.downloadNinePatch();
    expect(getPixel(png, 3, 41)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(getPixel(png, 41, 41)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  });
});

// Known bug: the border is drawn as a full solid shape and the (possibly translucent) fill is
// painted on top of it, so a transparent/translucent fill lets the opaque border colour show
// through the centre instead of the background.
test.fail('a fully transparent fill does not show the border colour through the centre', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setShape('rounded');
  await app.setSize(80, 80);
  await app.setBackground({ transparent: true });
  await app.setBorder(4, '#ff0000');
  await app.setFillColor('#0000ff');
  await app.setFillOpacity(0);

  const { png } = await app.downloadNinePatch();
  expect(getPixel(png, 41, 41)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(getPixel(png, 3, 41)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

// Known bug: same underlying cause — at 50% fill opacity the centre still has red mixed in
// from the opaque border shape underneath.
test.fail('a 50%-opacity fill has no red mixed in at the centre', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setShape('rounded');
  await app.setSize(80, 80);
  await app.setBackground({ transparent: true });
  await app.setBorder(4, '#ff0000');
  await app.setFillColor('#0000ff');
  await app.setFillOpacity(50);

  const { png } = await app.downloadNinePatch();
  expect(getPixel(png, 41, 41).r).toBe(0);
});

test.describe('gradient', () => {
  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFillType('gradient');
    await app.setGradientStop(0, { color: '#ff0000', position: 0, opacity: 100 });
    await app.setGradientStop(1, { color: '#0000ff', position: 100, opacity: 100 });
  });

  test('at 90deg, left of centre is redder and right of centre is bluer', async ({ page }) => {
    const app = new AppPage(page);
    await app.setGradientAngle(90);

    const { png } = await app.downloadNinePatch();
    const left = getPixel(png, 11, 41);
    const right = getPixel(png, 71, 41);
    expect(left.r).toBeGreaterThan(right.r);
    expect(left.b).toBeLessThan(right.b);
  });

  test('at 180deg, the top is redder than the bottom', async ({ page }) => {
    const app = new AppPage(page);
    await app.setGradientAngle(180);

    const { png } = await app.downloadNinePatch();
    const top = getPixel(png, 41, 11);
    const bottom = getPixel(png, 41, 71);
    expect(top.r).toBeGreaterThan(bottom.r);
    expect(top.b).toBeLessThan(bottom.b);
  });

  test('remove buttons are disabled at 2 stops, and enabled after adding a stop', async ({ page }) => {
    const app = new AppPage(page);
    await expect(app.gradientStopRemoveButtons).toHaveCount(2);
    await expect(app.gradientStopRemoveButtons.nth(0)).toBeDisabled();
    await expect(app.gradientStopRemoveButtons.nth(1)).toBeDisabled();

    await app.addGradientStop();
    await expect(app.gradientStopRemoveButtons).toHaveCount(3);
    await expect(app.gradientStopRemoveButtons.nth(0)).toBeEnabled();
    await expect(app.gradientStopRemoveButtons.nth(1)).toBeEnabled();
    await expect(app.gradientStopRemoveButtons.nth(2)).toBeEnabled();
  });

  test('removing a stop drops it and re-enables the fewer remaining stops correctly', async ({ page }) => {
    const app = new AppPage(page);
    await app.addGradientStop();
    await expect(app.gradientStopRemoveButtons).toHaveCount(3);

    await app.removeGradientStop(2);
    await expect(app.gradientStopRemoveButtons).toHaveCount(2);
    await expect(app.gradientStopRemoveButtons.nth(0)).toBeDisabled();
    await expect(app.gradientStopRemoveButtons.nth(1)).toBeDisabled();
  });

  // Regression guard (should PASS today): stop editors are keyed by array index, so removing a
  // middle stop reuses the DOM node that used to be the last stop. Each field's local text state
  // must re-sync from the new `value` prop rather than showing stale data.
  test('removing the middle of 3 stops leaves the remaining stops showing correct values', async ({ page }) => {
    const app = new AppPage(page);
    await app.setGradientStop(1, { opacity: 80 });
    await app.addGradientStop();
    await app.setGradientStop(2, { color: '#00ff00', position: 50, opacity: 60 });

    await app.removeGradientStop(1); // removes the original stop 2 (blue, 100%, 80%)

    const first = app.gradientStopFields(0);
    await expect(first.color).toHaveValue('#ff0000');
    await expect(first.position).toHaveValue('0');
    await expect(first.opacity).toHaveValue('100');

    const second = app.gradientStopFields(1);
    await expect(second.color).toHaveValue('#00ff00');
    await expect(second.position).toHaveValue('50');
    await expect(second.opacity).toHaveValue('60');
  });
});
