import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { AppPage } from './support/app';

// The stretch uniformity warning: pixels that change along a stretch axis look uneven once stretched.

test.use({ colorScheme: 'light' });

async function openApp(page: Page): Promise<AppPage> {
  const app = new AppPage(page);
  await app.goto();
  return app;
}

test('the gradient angle names the axis that is not uniform', async ({ page }) => {
  const app = await openApp(page);
  await app.setFillType('gradient');
  await app.setGradientAngle(90);
  await expect(app.warnings.filter({ hasText: 'The horizontal stretch region is not uniform' })).toHaveCount(1);
  await expect(app.warnings.filter({ hasText: 'The vertical' })).toHaveCount(0);
  await app.setGradientAngle(180);
  await expect(app.warnings.filter({ hasText: 'The vertical stretch region is not uniform' })).toHaveCount(1);
  await expect(app.warnings.filter({ hasText: 'The horizontal' })).toHaveCount(0);
});

// The first half proves the warning can appear at all, so the second half cannot pass by doing nothing.
test('a 1px stretch run silences the uniformity warning', async ({ page }) => {
  const app = await openApp(page);
  await app.setFillType('gradient');
  await app.setGradientAngle(180);
  await expect(app.warnings.filter({ hasText: 'not uniform' })).toHaveCount(1);
  await app.toggleRegionAuto('stretch');
  await app.setRegion('stretch', { h: 1 });
  await expect(app.warnings.filter({ hasText: 'not uniform' })).toHaveCount(0);
  await expect(app.validStatus).toBeVisible();
});

// Guard: anti-aliased curves must stay inside the tolerance, so no shipped preset warns.
for (const label of ['Focus ring', 'Button', 'Ghost button', 'Pill', 'Card']) {
  test(`the ${label} preset trips no warning`, async ({ page }) => {
    const app = await openApp(page);
    await app.presetButton(label).click();
    await expect(app.warnings).toHaveCount(0);
  });
}

test.describe('axe with a uniformity warning showing', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const seriousOrCritical = (results: { violations: Result[] }): Result[] =>
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

  for (const theme of ['light', 'dark'] as const) {
    test(`no serious or critical violations, ${theme} theme`, async ({ page }) => {
      const app = await openApp(page);
      await app.setFillType('gradient');
      await app.setGradientAngle(90);
      await expect(app.warnings.filter({ hasText: 'not uniform' })).toHaveCount(1);
      if (theme === 'dark') await app.darkModeToggle.click();
      await page.waitForFunction(() => document.getAnimations().length === 0);
      const violations = seriousOrCritical(await new AxeBuilder({ page }).analyze());
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }
});
