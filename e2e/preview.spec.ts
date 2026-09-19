import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { AppPage } from './support/app';

// specs/feature-3-stretched-preview.md § e2e test design.
// Defaults the rows rely on: content 80 by 80, corner radius 12, fill #4caf50, auto stretch
// and auto content both {12,12,56,56}, automatic target 240 by 160, scale 1x.

test.use({ colorScheme: 'light' });

const RED = [255, 0, 0, 255];
const GREEN = [76, 175, 80, 255];

async function cssBoxSize(locator: Locator): Promise<{ width: number; height: number } | null> {
  const box = await locator.boundingBox();
  return box ? { width: Math.round(box.width), height: Math.round(box.height) } : null;
}

async function backingSize(canvas: Locator): Promise<{ width: number; height: number }> {
  return canvas.evaluate((c) => ({ width: (c as HTMLCanvasElement).width, height: (c as HTMLCanvasElement).height }));
}

/** Opens the app at its default route; the shared `arrange` step for nearly every row below. */
async function openApp(page: Page): Promise<AppPage> {
  const app = new AppPage(page);
  await app.goto();
  return app;
}

/** The sample text box's offset and size relative to the preview canvas, in CSS pixels. */
async function sampleTextOffsets(app: AppPage): Promise<{ left: number; top: number; width: number; height: number }> {
  const [textBox, canvasBox] = await Promise.all([app.sampleText.boundingBox(), app.previewCanvas.boundingBox()]);
  if (!textBox || !canvasBox) throw new Error('sample text or preview canvas has no bounding box');
  return {
    left: Math.round(textBox.x - canvasBox.x),
    top: Math.round(textBox.y - canvasBox.y),
    width: Math.round(textBox.width),
    height: Math.round(textBox.height),
  };
}

// Row 1: the automatic target is 3x the content width, 2x the content height, at 1x scale.
test('row 1: fresh page shows the automatic 240 by 160 target at 1x', async ({ page }) => {
  const app = await openApp(page);
  await expect.poll(() => backingSize(app.previewCanvas)).toEqual({ width: 240, height: 160 });
  await expect(app.previewWidthField).toHaveValue('240');
  await expect(app.previewHeightField).toHaveValue('160');
  await expect(app.previewScaleRadio('1x')).toBeChecked();
});

// Row 2: a fixed border edge keeps its intrinsic width/height, it is not scaled with the axis.
const EDGE_PIXELS: Array<[number, number, number[]]> = [
  [3, 80, RED], [4, 80, GREEN],
  [120, 3, RED], [120, 4, GREEN],
  [236, 80, RED], [235, 80, GREEN],
  [120, 156, RED], [120, 155, GREEN],
];

test('row 2: fixed border edges are not scaled along their fixed axis', async ({ page }) => {
  const app = await openApp(page);
  await app.setBorder(4, '#ff0000');
  for (const [x, y, expected] of EDGE_PIXELS) {
    await expect.poll(() => app.previewPixel(x, y)).toEqual(expected);
  }
});

// Row 3: corners are copied verbatim from the source, byte for byte, not scaled or moved.
test('row 3: corners are copied verbatim, not scaled', async ({ page }) => {
  const app = await openApp(page);
  await app.setBorder(4, '#ff0000');
  const topLeftSource = await app.sourceBlock(0, 0, 12, 12);
  const bottomRightSource = await app.sourceBlock(68, 68, 12, 12);
  await expect.poll(() => app.previewBlock(0, 0, 12, 12)).toEqual(topLeftSource);
  await expect.poll(() => app.previewBlock(228, 148, 12, 12)).toEqual(bottomRightSource);
});

// Row 4: the width field drives both the backing store and the CSS size.
test('row 4: typing into Preview width drives the backing store and CSS size', async ({ page }) => {
  const app = await openApp(page);
  await app.setPreviewWidth(300);
  await expect.poll(() => backingSize(app.previewCanvas)).toEqual({ width: 300, height: 160 });
  await expect.poll(() => cssBoxSize(app.previewCanvas)).toEqual({ width: 300, height: 160 });
});

// Row 5: scale changes the CSS size only, never the backing store.
test('row 5: 2x scale doubles the CSS size but not the backing store', async ({ page }) => {
  const app = await openApp(page);
  await app.previewScaleRadio('2x').check();
  await expect.poll(() => backingSize(app.previewCanvas)).toEqual({ width: 240, height: 160 });
  await expect.poll(() => cssBoxSize(app.previewCanvas)).toEqual({ width: 480, height: 320 });
});

// Row 6: dragging the handle moves the target by the pointer delta, divided by the scale.
async function dragHandleBy(page: Page, handle: Locator, dx: number, dy: number): Promise<void> {
  const box = await handle.boundingBox();
  if (!box) throw new Error('resize handle has no bounding box');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2);
  await page.mouse.move(startX + dx, startY + dy);
  await page.mouse.up();
}

test('row 6: dragging the handle at 1x moves the target by the pointer delta', async ({ page }) => {
  const app = await openApp(page);
  await dragHandleBy(page, app.resizeHandle, 60, 30);
  await expect(app.previewWidthField).toHaveValue('300');
  await expect(app.previewHeightField).toHaveValue('190');
});

test('row 6: dragging the handle at 2x divides the pointer delta by the scale', async ({ page }) => {
  const app = await openApp(page);
  await app.previewScaleRadio('2x').check();
  await app.resizeHandle.scrollIntoViewIfNeeded();
  await dragHandleBy(page, app.resizeHandle, 40, 20);
  await expect(app.previewWidthField).toHaveValue('260');
  await expect(app.previewHeightField).toHaveValue('170');
});

// Row 7: the handle is keyboard operable, Shift steps by 10, and the target never drops below content size.
test('row 7: the handle is keyboard operable and respects the content size floor', async ({ page }) => {
  const app = await openApp(page);
  await app.resizeHandle.press('ArrowRight');
  await expect(app.previewWidthField).toHaveValue('241');
  await app.resizeHandle.press('Shift+ArrowDown');
  await expect(app.previewHeightField).toHaveValue('170');
  await app.setPreviewWidth(80);
  await expect(app.previewWidthField).toHaveValue('80');
  await app.resizeHandle.press('ArrowLeft');
  await expect(app.previewWidthField).toHaveValue('80');
});

// Row 8: the read time clamp never rewrites the stored target, it only clamps what is displayed.
test('row 8: the read time clamp never rewrites the stored target', async ({ page }) => {
  const app = await openApp(page);
  await app.setPreviewWidth(100);
  await app.setSize(150, 80);
  await expect(app.previewWidthField).toHaveValue('150');
  await app.setSize(80, 80);
  await expect(app.previewWidthField).toHaveValue('100');
});

// Row 9: Reset returns the target to automatic (null), not to whatever was last typed.
test('row 9: Reset returns the target to automatic', async ({ page }) => {
  const app = await openApp(page);
  await app.setPreviewWidth(300);
  await app.resetButton.click();
  await expect(app.previewWidthField).toHaveValue('240');
  await expect(app.previewHeightField).toHaveValue('160');
});

// Row 10: the preview target is not part of the config, so a share link never carries it;
// the reopened page falls back to automatic, computed from the linked content width.
test('row 10: the preview target does not travel with the share link', async ({ page, context }) => {
  const app = await openApp(page);
  await app.setSize(90, 80);
  await app.setPreviewWidth(300);
  await expect.poll(() => page.url()).toContain('c=');
  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  const secondApp = new AppPage(secondPage);
  await expect(secondApp.previewWidthField).toHaveValue('270');
});

// Row 11: the sample text box keeps the padding fixed and scales with the preview scale.
test('row 11: the sample text box is padded, not scaled, and follows the preview scale', async ({ page }) => {
  const app = await openApp(page);
  await expect.poll(() => sampleTextOffsets(app)).toEqual({ left: 12, top: 12, width: 216, height: 136 });
  await app.previewScaleRadio('2x').check();
  await expect.poll(() => sampleTextOffsets(app)).toEqual({ left: 24, top: 24, width: 432, height: 272 });
});

// Row 12: a disabled content region is treated as the whole target, not a missing box.
test('row 12: disabling the content region treats it as the whole target', async ({ page }) => {
  const app = await openApp(page);
  await app.setRegionEnabled('content', false);
  await expect.poll(() => sampleTextOffsets(app)).toEqual({ left: 0, top: 0, width: 240, height: 160 });
});

// Row 13: Show guides toggles a dashed outline on the sample text box.
test('row 13: Show guides toggles the sample text outline', async ({ page }) => {
  const app = await openApp(page);
  await app.showGuidesCheckbox.check();
  await expect.poll(() => app.sampleText.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('dashed');
  await app.showGuidesCheckbox.uncheck();
  await expect.poll(() => app.sampleText.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
});

// Row 14: a gradient names the one axis that is not uniform, never the other.
test('row 14: the gradient angle names the axis that is not uniform', async ({ page }) => {
  const app = await openApp(page);
  await app.setFillType('gradient');
  await app.setGradientAngle(90);
  await expect(app.warnings.filter({ hasText: 'The horizontal stretch region is not uniform' })).toHaveCount(1);
  await expect(app.warnings.filter({ hasText: 'The vertical' })).toHaveCount(0);
  await app.setGradientAngle(180);
  await expect(app.warnings.filter({ hasText: 'The vertical stretch region is not uniform' })).toHaveCount(1);
  await expect(app.warnings.filter({ hasText: 'The horizontal' })).toHaveCount(0);
});

// Row 15: a 1px stretch run is always uniform, silencing a warning that was there a moment ago.
test('row 15: a 1px stretch run silences the uniformity warning', async ({ page }) => {
  const app = await openApp(page);
  await app.setFillType('gradient');
  await app.setGradientAngle(180);
  await expect(app.warnings.filter({ hasText: 'not uniform' })).toHaveCount(1);
  await app.toggleRegionAuto('stretch');
  await app.setRegion('stretch', { h: 1 });
  await expect(app.warnings.filter({ hasText: 'not uniform' })).toHaveCount(0);
  await expect(app.validStatus).toBeVisible();
});

// Row 16: guard row, none of the shipped presets should trip the uniformity check.
const PRESET_LABELS = ['Focus ring', 'Button', 'Ghost button', 'Pill', 'Card'];

for (const label of PRESET_LABELS) {
  test(`row 16: the ${label} preset trips no warning`, async ({ page }) => {
    const app = await openApp(page);
    await app.presetButton(label).click();
    await expect(app.warnings).toHaveCount(0);
  });
}

// Row 17: with the stretch region disabled the whole image scales uniformly (stretch: null),
// so a 4px border becomes 12px wide at the automatic 3x horizontal scale.
test('row 17: a disabled stretch region still scales the whole image', async ({ page }) => {
  const app = await openApp(page);
  await app.setBorder(4, '#ff0000');
  await app.setRegionEnabled('stretch', false);
  await expect.poll(() => app.previewPixel(8, 80)).toEqual(RED);
});

// Row 18: the preview must never show the previous frame of the source. A preset is one single
// config change (a typed field commits twice, and the second commit would repaint a stale preview
// and hide the bug). Poll only the source, then take exactly one direct read of the preview.
test('row 18: the preview is drawn from the source after it, in the same commit', async ({ page }) => {
  const app = await openApp(page);
  const CARD_FILL = [31, 31, 35, 255];
  await app.presetButton('Card').click();
  await expect.poll(() => app.sourceBlock(32, 32, 1, 1)).toEqual(CARD_FILL);
  expect(await app.previewPixel(96, 64)).toEqual(CARD_FILL);
});

// Row 19: axe, serious/critical, with a uniformity warning showing, light and dark.
test.describe('row 19: axe with a uniformity warning showing', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  function seriousOrCritical(results: { violations: Result[] }): Result[] {
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  }
  for (const theme of ['light', 'dark'] as const) {
    test(`no serious/critical violations, ${theme} theme`, async ({ page }) => {
      const app = await openApp(page);
      await app.setFillType('gradient');
      await app.setGradientAngle(90);
      await expect(app.warnings.filter({ hasText: 'not uniform' })).toHaveCount(1);
      if (theme === 'dark') await app.darkModeToggle.click();
      await page.waitForFunction(() => document.getAnimations().length === 0);
      const results = await new AxeBuilder({ page }).analyze();
      const violations = seriousOrCritical(results);
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }
});

// Row 20: the pane never causes page level horizontal scroll, and the handle starts on screen at 1280.
const VIEWPORT_WIDTHS = [360, 768, 1280];

for (const width of VIEWPORT_WIDTHS) {
  test(`row 20: no page level horizontal scroll at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const app = await openApp(page);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth))
      .toBe(true);
    if (width === 1280) {
      await expect(app.resizeHandle).toBeInViewport();
    }
  });
}
