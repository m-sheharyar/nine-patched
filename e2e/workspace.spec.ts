import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';

test.use({ colorScheme: 'light' });

test.describe('default zoom is Fit', () => {
  test.describe(() => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('the default 82x82 image fits at 5x on a 1440x900 viewport', async ({ page }) => {
      const app = new AppPage(page);
      await app.goto();

      await expect(app.fitButton).toHaveAttribute('aria-pressed', 'true');
      await expect(app.zoomLevelStatus).toHaveText('5×');

      const size = await app.canvasSize();
      const box = await app.canvas.boundingBox();
      expect(box?.width).toBe(size.width * 5);
      expect(box?.height).toBe(size.height * 5);
    });
  });

  test.describe(() => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the default 82x82 image fits at 2x on a 390x844 viewport', async ({ page }) => {
      const app = new AppPage(page);
      await app.goto();

      await expect(app.fitButton).toHaveAttribute('aria-pressed', 'true');
      await expect(app.zoomLevelStatus).toHaveText('2×');

      const size = await app.canvasSize();
      const box = await app.canvas.boundingBox();
      expect(box?.width).toBe(size.width * 2);
      expect(box?.height).toBe(size.height * 2);
    });
  });
});

test.describe('zoom controls', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Zoom in / Zoom out step along the ladder and un-press Fit', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    expect(await app.zoomLevel()).toBe(5);

    await app.zoomInButton.click();
    await expect(app.zoomLevelStatus).toHaveText('6×');
    await expect(app.fitButton).toHaveAttribute('aria-pressed', 'false');

    await app.zoomInButton.click();
    await expect(app.zoomLevelStatus).toHaveText('8×');

    await app.zoomOutButton.click();
    await expect(app.zoomLevelStatus).toHaveText('6×');
  });

  test('Zoom in clamps at 32x and disables the button', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    for (let i = 0; i < 15 && !(await app.zoomInButton.isDisabled()); i++) {
      await app.zoomInButton.click();
    }
    await expect(app.zoomLevelStatus).toHaveText('32×');
    await expect(app.zoomInButton).toBeDisabled();
  });

  test('Zoom out clamps at 1x and disables the button', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    for (let i = 0; i < 15 && !(await app.zoomOutButton.isDisabled()); i++) {
      await app.zoomOutButton.click();
    }
    await expect(app.zoomLevelStatus).toHaveText('1×');
    await expect(app.zoomOutButton).toBeDisabled();
  });

  test('Fit restores the fit level after a manual zoom', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    expect(await app.zoomLevel()).toBe(5);

    await app.zoomInButton.click();
    await expect(app.zoomLevelStatus).not.toHaveText('5×');
    await expect(app.fitButton).toHaveAttribute('aria-pressed', 'false');

    await app.fitButton.click();
    await expect(app.zoomLevelStatus).toHaveText('5×');
    await expect(app.fitButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('the canvas width/height attributes never change with zoom, only its CSS size', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const before = await app.canvasSize();
    await app.zoomInButton.click();
    await app.zoomInButton.click();
    const zoom = await app.zoomLevel();
    const after = await app.canvasSize();

    expect(after).toEqual(before);
    const box = await app.canvas.boundingBox();
    expect(box?.width).toBe(before.width * zoom);
    expect(box?.height).toBe(before.height * zoom);
  });
});

test.describe('zoom tracks the stage only in Fit mode', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('resizing the viewport in Fit mode changes the zoom level', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const before = await app.zoomLevel();

    await page.setViewportSize({ width: 800, height: 700 });
    await expect.poll(() => app.zoomLevel()).not.toBe(before);
    await expect(app.fitButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('resizing the viewport after a manual zoom does not change the zoom level', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await app.zoomOutButton.click();
    const manual = await app.zoomLevel();
    const widthBefore = await app.stageBackground.evaluate((el) => el.clientWidth);

    await page.setViewportSize({ width: 800, height: 700 });
    // Proves the resize (and its ResizeObserver callback) has actually been processed before
    // asserting the zoom held steady, rather than racing a wait that could pass by accident.
    await expect.poll(() => app.stageBackground.evaluate((el) => el.clientWidth)).not.toBe(widthBefore);

    expect(await app.zoomLevel()).toBe(manual);
    await expect(app.fitButton).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('guides', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the overlay is visible by default and hidden when Show guides is unchecked', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await expect(app.showGuidesCheckbox).toBeChecked();
    await expect(app.guideOverlay).toBeVisible();

    await app.showGuidesCheckbox.uncheck();
    await expect(app.guideOverlay).toBeHidden();

    await app.showGuidesCheckbox.check();
    await expect(app.guideOverlay).toBeVisible();
  });

  test('the overlay bounding box tracks the canvas bounding box at several zoom levels for a non-square size', async ({
    page,
  }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setShape('pill');
    await app.setSize(121, 43);

    const assertAligned = async () => {
      const canvasBox = await app.canvas.boundingBox();
      const overlayBox = await app.guideOverlay.boundingBox();
      if (!canvasBox || !overlayBox) throw new Error('expected both the canvas and the overlay to have a layout box');
      expect(Math.abs(canvasBox.x - overlayBox.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(canvasBox.y - overlayBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(canvasBox.width - overlayBox.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(canvasBox.height - overlayBox.height)).toBeLessThanOrEqual(1);
    };

    await assertAligned();
    await app.zoomInButton.click();
    await assertAligned();
    await app.zoomInButton.click();
    await assertAligned();
    await app.zoomOutButton.click();
    await app.zoomOutButton.click();
    await app.zoomOutButton.click();
    await assertAligned();
  });

  test('disabling the stretch region removes the stretch guide lines', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await expect(app.guideOverlay.locator('line')).toHaveCount(4);
    await app.setRegionEnabled('stretch', false);
    await expect(app.guideOverlay.locator('line')).toHaveCount(0);
  });

  test('disabling the content region removes the content guide rect', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await expect(app.guideOverlay.locator('rect')).toHaveCount(1);
    await app.setRegionEnabled('content', false);
    await expect(app.guideOverlay.locator('rect')).toHaveCount(0);
  });
});

test.describe('the overlay never leaks into the export', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the exported PNG is pixel-identical with guides on and with guides off', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const withGuides = await app.downloadNinePatch();
    await app.showGuidesCheckbox.uncheck();
    const withoutGuides = await app.downloadNinePatch();

    expect(withoutGuides.png.width).toBe(withGuides.png.width);
    expect(withoutGuides.png.height).toBe(withGuides.png.height);
    expect(withoutGuides.png.data.equals(withGuides.png.data)).toBe(true);
  });

  test('the exported PNG is pixel-identical at different zoom levels', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const atFit = await app.downloadNinePatch();

    await app.zoomInButton.click();
    await app.zoomInButton.click();
    const zoomedIn = await app.downloadNinePatch();
    expect(zoomedIn.png.data.equals(atFit.png.data)).toBe(true);

    for (let i = 0; i < 10 && !(await app.zoomOutButton.isDisabled()); i++) {
      await app.zoomOutButton.click();
    }
    const zoomedOut = await app.downloadNinePatch();
    expect(zoomedOut.png.data.equals(atFit.png.data)).toBe(true);
  });
});

test.describe('status line', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('shows Valid 9-patch and the exported size text by default', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await expect(app.validStatus).toBeVisible();
    await expect(page.getByText('Exported file: 82 × 82 px (content 80 × 80 + 1px 9-patch frame)')).toBeVisible();
    await expect(app.warnings).toHaveCount(0);
  });

  test('disabling the stretch region shows the warning and hides Valid 9-patch', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await app.setRegionEnabled('stretch', false);
    await expect(app.validStatus).toBeHidden();
    await expect(app.warnings.filter({ hasText: 'No stretch markers' })).toHaveCount(1);
  });
});
