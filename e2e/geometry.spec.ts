import { expect, test } from '@playwright/test';
import { AppPage, type Shape } from './support/app';
import { assertValidNinePatch, getPixel, readMarkers } from './support/ninePatch';

test.use({ colorScheme: 'light' });

const SHAPES: Shape[] = ['rounded', 'pill', 'ellipse', 'rectangle'];

for (const shape of SHAPES) {
  test(`${shape}: exports a structurally valid 9-patch at the default size`, async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setShape(shape);

    const { png } = await app.downloadNinePatch();
    // Default content 64x32 plus a 1px frame on each side.
    expect(png.width).toBe(66);
    expect(png.height).toBe(34);
    expect(() => assertValidNinePatch(png)).not.toThrow();

    // Only a plain rectangle has no corner rounding, so only it fills the content corner.
    const corner = getPixel(png, 1, 1);
    if (shape === 'rectangle') {
      expect(corner.a).toBe(255);
    } else {
      expect(corner.a).toBe(0);
    }
  });
}

test('changing the size changes the exported PNG dimensions', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setSize(120, 40);

  const { png } = await app.downloadNinePatch();
  expect(png.width).toBe(122);
  expect(png.height).toBe(42);
});

test('the corner radius field is enabled only for the rounded shape', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();

  await app.setShape('rounded');
  await expect(app.cornerRadiusField).toBeEnabled();

  for (const shape of ['pill', 'ellipse', 'rectangle'] as const) {
    await app.setShape(shape);
    await expect(app.cornerRadiusField).toBeDisabled();
  }
});

test('pill 80x40 on Auto has a small vertical stretch marker centred on the shape', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setShape('pill');
  await app.setSize(80, 40);

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);

  expect(markers.left.length).toBeGreaterThan(0);
  const [run] = markers.left;
  expect(run.end - run.start + 1).toBeLessThanOrEqual(2);
  expect(run.start).toBeLessThanOrEqual(21);
  expect(run.end).toBeGreaterThanOrEqual(20);

  await expect(app.warnings.filter({ hasText: 'No stretch markers' })).toHaveCount(0);
});

test('ellipse 100x50 on Auto has small centred top and left markers, no warning', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setShape('ellipse');
  await app.setSize(100, 50);

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);

  expect(markers.top).toHaveLength(1);
  expect(markers.top[0].end - markers.top[0].start + 1).toBeLessThanOrEqual(2);
  const topCentre = png.width / 2;
  expect(markers.top[0].start).toBeGreaterThanOrEqual(topCentre - 1);
  expect(markers.top[0].end).toBeLessThanOrEqual(topCentre + 1);

  expect(markers.left).toHaveLength(1);
  expect(markers.left[0].end - markers.left[0].start + 1).toBeLessThanOrEqual(2);
  const leftCentre = png.height / 2;
  expect(markers.left[0].start).toBeGreaterThanOrEqual(leftCentre - 1);
  expect(markers.left[0].end).toBeLessThanOrEqual(leftCentre + 1);

  await expect(app.warnings).toHaveCount(0);
});

test('circle 80x80 on Auto has small centred top and left markers, no warning', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setShape('ellipse');
  await app.setSize(80, 80);

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);

  expect(markers.top).toHaveLength(1);
  expect(markers.top[0].end - markers.top[0].start + 1).toBeLessThanOrEqual(2);
  const centre = png.width / 2;
  expect(markers.top[0].start).toBeGreaterThanOrEqual(centre - 1);
  expect(markers.top[0].end).toBeLessThanOrEqual(centre + 1);

  expect(markers.left).toHaveLength(1);
  expect(markers.left[0].end - markers.left[0].start + 1).toBeLessThanOrEqual(2);
  expect(markers.left[0].start).toBeGreaterThanOrEqual(centre - 1);
  expect(markers.left[0].end).toBeLessThanOrEqual(centre + 1);

  await expect(app.warnings).toHaveCount(0);
});

test('typing 0 into Width without blurring still keeps the canvas at the minimum size', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.widthField.fill('0');
  await expect(app.canvas).toHaveAttribute('width', '3');
});

test('typing -5 into Width without blurring still keeps the canvas at the minimum size', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.widthField.fill('-5');
  await expect(app.canvas).toHaveAttribute('width', '3');
});

test('a square pill says it draws as a circle, and only then', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  const hint = page.getByText('At equal width and height a pill is a circle.');

  await app.setSize(80, 80);
  await expect(hint).toHaveCount(0);
  await app.setShape('pill');
  await expect(hint).toBeVisible();

  await app.setShape('ellipse');
  await expect(hint).toHaveCount(0);

  await app.setShape('pill');
  await app.setSize(120, 80);
  await expect(hint).toHaveCount(0);
});
