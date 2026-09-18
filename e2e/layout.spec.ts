import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';

test.use({ colorScheme: 'light' });

test.describe('responsive layout', () => {
  test.describe(() => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('at 1440x900 the inspector sits to the right of the workspace', async ({ page }) => {
      const app = new AppPage(page);
      await app.goto();

      const workspaceBox = await app.workspace.boundingBox();
      const inspectorBox = await app.inspector.boundingBox();
      if (!workspaceBox || !inspectorBox) throw new Error('expected both panes to have a layout box');

      expect(inspectorBox.x).toBeGreaterThanOrEqual(workspaceBox.x + workspaceBox.width - 1);
    });
  });

  test.describe(() => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('at 390x844 the inspector sits below the workspace', async ({ page }) => {
      const app = new AppPage(page);
      await app.goto();

      const workspaceBox = await app.workspace.boundingBox();
      const inspectorBox = await app.inspector.boundingBox();
      if (!workspaceBox || !inspectorBox) throw new Error('expected both panes to have a layout box');

      expect(inspectorBox.y).toBeGreaterThanOrEqual(workspaceBox.y + workspaceBox.height - 1);
    });
  });

  test.describe(() => {
    test.use({ viewport: { width: 360, height: 740 } });

    test('at 360x740 there is no horizontal page scroll, and the download flow still works', async ({ page }) => {
      const app = new AppPage(page);
      await app.goto();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

      await expect(app.downloadButton).toBeVisible();
      await expect(app.fileNameField).toBeVisible();

      await app.setFileName('narrow-viewport');
      const { suggestedFilename } = await app.downloadNinePatch();
      expect(suggestedFilename).toBe('narrow-viewport.9.png');
    });
  });
});

test.describe('keyboard accessibility', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Download is reachable by Tab alone from the top of the page and triggers with Enter', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    let reached = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      reached = await app.downloadButton.evaluate((el) => el === document.activeElement);
      if (reached) break;
    }
    expect(reached).toBe(true);
    await expect(app.downloadButton).toBeFocused();
    expect(await app.downloadButton.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(download.suggestedFilename()).toBe('nine_patch.9.png');
  });
});

test.describe('dark mode', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the stage checkerboard background differs between themes', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const light = await app.stageBackground.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(light).toBe('rgb(255, 255, 255)');

    await app.darkModeToggle.click();
    await expect
      .poll(() => app.stageBackground.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe('rgb(82, 82, 91)');
  });
});

test.describe('accessibility scan (axe-core)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  function seriousOrCritical(results: { violations: Result[] }): Result[] {
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  }

  function describeViolations(violations: Result[]): string {
    return violations
      .map(
        (v) =>
          `${v.id} (${v.impact}): ${v.help}\n` +
          v.nodes.map((n) => `  target=${JSON.stringify(n.target)} :: ${n.failureSummary}`).join('\n'),
      )
      .join('\n');
  }

  // Known issue: color-contrast (serious). Reproduces in every combination below.
  // 1. The ".9.png" filename suffix (src/components/FileNameField.tsx, text-zinc-400 /
  //    dark:text-zinc-500) is under the 4.5:1 text contrast ratio in both themes
  //    (measured ~2.62:1 light, ~4.12:1 dark).
  // 2. In light mode only, the inactive "Fill type" segmented option
  //    (src/components/SegmentedControl.tsx, text-zinc-500 on the zinc-100 track) also falls
  //    just short, at ~4.39:1.
  // See the reported violation details in the test output/trace for exact colors and targets.
  test.fail('no serious/critical violations on the default page, light theme', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  // Known issue: color-contrast (serious) — the ".9.png" suffix, see above.
  test.fail('no serious/critical violations on the default page, dark theme', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.darkModeToggle.click();
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  // Known issue: color-contrast (serious), both issues above.
  test.fail('no serious/critical violations with gradient fill selected, light theme', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFillType('gradient');
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  // Known issue: color-contrast (serious) — the ".9.png" suffix, see above.
  test.fail('no serious/critical violations with gradient fill selected, dark theme', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.darkModeToggle.click();
    await app.setFillType('gradient');
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
