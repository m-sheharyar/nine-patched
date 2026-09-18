import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';
import { assertValidNinePatch, getPixel, readMarkers } from './support/ninePatch';

test.use({ colorScheme: 'light' });

test.describe('app shell', () => {
  test('loads with heading and canvas visible, no console or page errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app = new AppPage(page);
    await app.goto();

    await expect(app.heading).toBeVisible();
    await expect(app.canvas).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('default 9-patch export', () => {
  test('produces a structurally valid 9-patch PNG with the expected markers and colours', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const { suggestedFilename, png } = await app.downloadNinePatch();

    expect(suggestedFilename).toBe('nine_patch.9.png');
    expect(png.width).toBe(82);
    expect(png.height).toBe(82);

    expect(() => assertValidNinePatch(png)).not.toThrow();

    const expectedRun = [{ start: 13, end: 68 }];
    const markers = readMarkers(png);
    expect(markers.top).toEqual(expectedRun);
    expect(markers.left).toEqual(expectedRun);
    expect(markers.bottom).toEqual(expectedRun);
    expect(markers.right).toEqual(expectedRun);

    // Centre of the fill: default solid colour #4caf50, fully opaque.
    expect(getPixel(png, 41, 41)).toEqual({ r: 76, g: 175, b: 80, a: 255 });

    // Content corner (1,1): outside the rounded-rect radius, so still transparent.
    expect(getPixel(png, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });
});

test.describe('dark mode', () => {
  test('toggle flips the dark class on <html> and persists across reload', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    await app.darkModeToggle.click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });
});
