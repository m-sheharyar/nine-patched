import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';
import { readMarkers } from './support/ninePatch';

test.use({ colorScheme: 'light' });

test('a manual stretch region produces exactly matching top/left marker runs', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.toggleRegionAuto('stretch');
  await app.setRegion('stretch', { x: 10, y: 5, w: 20, h: 30 });

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);
  expect(markers.top).toEqual([{ start: 11, end: 30 }]);
  expect(markers.left).toEqual([{ start: 6, end: 35 }]);
});

test('a manual content region produces exactly matching bottom/right marker runs', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.toggleRegionAuto('content');
  await app.setRegion('content', { x: 15, y: 8, w: 25, h: 12 });

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);
  expect(markers.bottom).toEqual([{ start: 16, end: 40 }]);
  expect(markers.right).toEqual([{ start: 9, end: 20 }]);
});

test('disabling stretch removes the top/left markers and shows a warning', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setRegionEnabled('stretch', false);

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);
  expect(markers.top).toEqual([]);
  expect(markers.left).toEqual([]);
  await expect(app.warnings.filter({ hasText: 'No stretch markers' })).toHaveCount(1);
});

test('disabling content removes the bottom/right markers', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setRegionEnabled('content', false);

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);
  expect(markers.bottom).toEqual([]);
  expect(markers.right).toEqual([]);
  // Content has no warning of its own; the default stretch markers are unaffected.
  expect(markers.top.length).toBeGreaterThan(0);
  expect(markers.left.length).toBeGreaterThan(0);
});

test('shrinking the content size clamps a manual stretch region to fit', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.toggleRegionAuto('stretch');
  await app.setRegion('stretch', { x: 10, y: 10, w: 60, h: 60 });
  await app.setSize(20, 20);

  const { png } = await app.downloadNinePatch();
  const markers = readMarkers(png);
  expect(markers.top).toEqual([{ start: 11, end: 20 }]);
  expect(markers.left).toEqual([{ start: 11, end: 20 }]);
});
