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
    expect(png.width).toBe(82);
    expect(png.height).toBe(82);
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

// Known bug: pill with even height has no vertical stretch marker (the pill radius always
// consumes the entire smaller dimension, zeroing autoRegion's height on that axis).
test.fail('pill 80x40 on Auto has a small vertical stretch marker centred on the shape', async ({ page }) => {
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

// Known bug: ellipse Auto region marks curved pixels as stretchable instead of a small centred run.
test.fail('ellipse 100x50 on Auto has small centred top and left markers, no warning', async ({ page }) => {
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

// Known bug: a circle (ellipse with equal sides) on Auto gets no stretch markers at all.
test.fail('circle 80x80 on Auto has small centred top and left markers, no warning', async ({ page }) => {
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

// Known bug: NumberField only applies `min` on blur, not while typing, so the live-updated
// canvas briefly (or indefinitely, if never blurred) reflects an out-of-range content size.
test.fail('typing 0 into Width without blurring still keeps the canvas at the minimum size', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.widthField.fill('0');
  await expect(app.canvas).toHaveAttribute('width', '3');
});

// Known bug: same as above, for a negative value.
test.fail('typing -5 into Width without blurring still keeps the canvas at the minimum size', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.widthField.fill('-5');
  await expect(app.canvas).toHaveAttribute('width', '3');
});
