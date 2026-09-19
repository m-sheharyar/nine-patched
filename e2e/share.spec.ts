import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { AppPage } from './support/app';

test.use({ colorScheme: 'light' });

// Builds a valid `c` value the same way `encodeConfig` does: compact JSON, base64url over the
// UTF-8 bytes. Kept local so the spec never imports `src/lib/shareLink.ts`.
function encodeConfigPatch(patch: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(patch)).toString('base64url');
}

// Reverse of the above, applied to the `c` param of a page URL (or hash string).
function decodeConfigFromUrl(url: string): Record<string, unknown> {
  const hash = new URL(url, 'http://placeholder').hash.replace(/^#/, '');
  const c = new URLSearchParams(hash).get('c');
  if (!c) return {};
  return JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));
}

test.describe('opening a share link', () => {
  test('applies the config and the file name, with no notice', async ({ page }) => {
    const app = new AppPage(page);
    const c = encodeConfigPatch({ contentWidth: 321, contentHeight: 234, cornerRadius: 41 });
    const n = encodeURIComponent('shared_patch');
    await page.goto(`/#c=${c}&n=${n}`);

    await expect(app.widthField).toHaveValue('321');
    await expect(app.heightField).toHaveValue('234');
    await expect(app.cornerRadiusField).toHaveValue('41');
    await expect(app.fileNameField).toHaveValue('shared_patch');
    await expect(app.notice).not.toBeVisible();
  });

  test('a hashchange in the same tab applies the new config', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const hash = `c=${encodeConfigPatch({ contentWidth: 555 })}`;

    await page.evaluate((h) => {
      location.hash = h;
    }, hash);

    await expect(app.widthField).toHaveValue('555');
  });

  test('fields invalid in the link reset to defaults; valid fields still apply; dismiss clears it', async ({
    page,
  }) => {
    const app = new AppPage(page);
    // cornerRadius 12 stays under the resulting max (floor(min(64, 32) / 2) = 16 once contentWidth resets).
    const c = encodeConfigPatch({ shape: 'triangle', contentWidth: 999999, cornerRadius: 12 });
    await page.goto(`/#c=${c}`);

    const text = (await app.notice.textContent()) ?? '';
    expect(text.startsWith('Some settings in this link were invalid and were reset to their defaults:')).toBe(true);
    expect(text).toContain('shape');
    expect(text).toContain('contentWidth');
    await expect(app.cornerRadiusField).toHaveValue('12');

    await app.dismissNoticeButton.click();
    await expect(app.notice).not.toBeVisible();
  });

  test('a c value that cannot be decoded at all falls back to defaults', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const defaultWidth = await app.widthField.inputValue();

    await page.goto('/#c=!!!');

    await expect(app.notice).toContainText('Could not read that link');
    await expect(app.widthField).toHaveValue(defaultWidth);
  });

  test('a malformed percent sequence in the name falls back to the default file name', async ({ page }) => {
    const app = new AppPage(page);
    await page.goto('/#n=%E0%A4%A');

    const text = (await app.notice.textContent()) ?? '';
    expect(text.startsWith('Some settings in this link were invalid and were reset to their defaults:')).toBe(true);
    expect(text).toContain('name');
    await expect(app.fileNameField).toHaveValue('nine_patch');
  });
});

test.describe('url sync while editing', () => {
  test('an edit reaches the url hash after the debounce, without growing history', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const historyBefore = await page.evaluate(() => history.length);

    // Stays under the default canvas's max radius (floor(min(64, 32) / 2) = 16).
    await app.setCornerRadius(12);
    await expect.poll(() => decodeConfigFromUrl(page.url()), { timeout: 1500 }).toMatchObject({ cornerRadius: 12 });

    const historyAfter = await page.evaluate(() => history.length);
    expect(historyAfter).toBe(historyBefore);
  });

  test('defaults give a bare url; reset removes an edited hash at once', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    expect(page.url()).not.toContain('#');

    await app.setCornerRadius(25);
    await expect.poll(() => page.url()).toContain('#');

    await app.resetButton.click();
    // Read straight from the page, with no polling: the debounce would also clear it 300 ms later.
    expect(await page.evaluate(() => window.location.href)).not.toContain('#');
  });
});

test.describe('copy share link', () => {
  test('with a working clipboard, copies the on-screen state immediately and shows "Link copied"', async ({ page }) => {
    // A recording clipboard rather than the real one: only Chromium lets a test grant clipboard
    // permissions, and what is under test is the text the app hands over, not the browser.
    await page.addInitScript(() => {
      const copied: string[] = [];
      Object.defineProperty(window, '__copied', { value: copied });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (text: string) => void copied.push(text) },
      });
    });
    const app = new AppPage(page);
    await app.goto();
    const base = new URL(page.url());

    // Stays under the default canvas's max radius (floor(min(64, 32) / 2) = 16).
    await app.setCornerRadius(15);
    await app.copyShareLinkButton.click();

    await expect(app.notice).toContainText('Link copied');
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    const expected = `${base.origin}${base.pathname}${base.search}#c=${encodeConfigPatch({ cornerRadius: 15 })}`;
    expect(copied).toEqual([expected]);
  });

  test('without the clipboard api, focuses a prefilled read only "Share link" input', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }));
    const app = new AppPage(page);
    await app.goto();

    await app.copyShareLinkButton.click();

    await expect(app.notice).toContainText('Copy this link');
    await expect(app.shareLinkInput).toBeFocused();
    await expect(app.shareLinkInput).toHaveValue(page.url());
  });
});

test.describe('export', () => {
  test('downloads a document named after the config, with canonical top level key order', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFileName('my_share');
    // Stays under the default canvas's max radius (floor(min(64, 32) / 2) = 16).
    await app.setCornerRadius(15);

    const { json, suggestedFilename } = await app.downloadConfig();

    expect(suggestedFilename).toBe('my_share.9patch.json');
    expect(Object.keys(json as object)).toEqual(['version', 'name', 'config']);
    const doc = json as { version: number; name: string; config: { cornerRadius: number } };
    expect(doc.version).toBe(1);
    expect(doc.name).toBe('my_share');
    expect(doc.config.cornerRadius).toBe(15);
  });

  test('the name inside the exported document is sanitised like the file name', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFileName('my/asset:v2');

    const { json, suggestedFilename } = await app.downloadConfig();

    expect(suggestedFilename).toBe('my_asset_v2.9patch.json');
    expect((json as { name: string }).name).toBe('my_asset_v2');
  });

  test('export then import round trips to a pixel identical png', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFileName('roundtrip');
    await app.setCornerRadius(18);
    await app.setFillColor('#336699');

    const before = await app.downloadNinePatch();
    const { json: configJson } = await app.downloadConfig();

    await app.resetButton.click();
    await app.importConfigFileInput.setInputFiles({
      name: 'roundtrip.9patch.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(configJson)),
    });
    await expect(app.fileNameField).toHaveValue('roundtrip');

    const after = await app.downloadNinePatch();
    expect(after.png.width).toBe(before.png.width);
    expect(after.png.height).toBe(before.png.height);
    expect(after.png.data.equals(before.png.data)).toBe(true);
  });
});

/** A document that would import fine, padded with trailing whitespace past the 262144 byte cap. */
function oversizeValidDocument(): Buffer {
  const doc = JSON.stringify({ version: 1, name: 'big', config: { cornerRadius: 33 } });
  return Buffer.from(doc + ' '.repeat(262144 + 1 - doc.length));
}

test.describe('import errors', () => {
  const cases: { label: string; file: { name: string; mimeType: string; buffer: Buffer } }[] = [
    {
      label: 'a garbage text file',
      file: { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('not json at all') },
    },
    {
      label: 'a json array',
      file: { name: 'array.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([1, 2, 3])) },
    },
    {
      label: 'a file larger than the limit',
      file: { name: 'big.json', mimeType: 'application/json', buffer: oversizeValidDocument() },
    },
  ];

  for (const { label, file } of cases) {
    test(`${label} shows "Could not read that file" and leaves the config unchanged`, async ({ page }) => {
      const app = new AppPage(page);
      await app.goto();
      await app.setCornerRadius(25);
      const before = await app.cornerRadiusField.inputValue();

      await app.importConfigFileInput.setInputFiles(file);

      await expect(app.notice).toContainText('Could not read that file');
      await expect(app.cornerRadiusField).toHaveValue(before);
    });
  }

  test('a file with invalid fields applies the valid ones; importing it twice in a row works', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const file = {
      name: 'partial.9patch.json',
      mimeType: 'application/json',
      // cornerRadius 12 stays under the resulting max (floor(min(64, 32) / 2) = 16, the shape being
      // invalid leaves contentWidth/Height at their defaults).
      buffer: Buffer.from(
        JSON.stringify({ version: 1, name: 'from_file', config: { shape: 'triangle', cornerRadius: 12 } }),
      ),
    };

    await app.importConfigFileInput.setInputFiles(file);
    await expect(app.notice).toContainText(
      /^Some settings in this file were invalid and were reset to their defaults:.*shape/,
    );
    await expect(app.cornerRadiusField).toHaveValue('12');
    // The input is emptied after every pick, otherwise a browser would not fire change for the same file.
    await expect(app.importConfigFileInput).toHaveValue('');

    await app.importConfigFileInput.setInputFiles(file);
    await expect(app.cornerRadiusField).toHaveValue('12');
  });
});

test.describe('top bar at small width', () => {
  test('the import file input is not a tab stop; the three buttons stay reachable by role at 360px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const app = new AppPage(page);
    await app.goto();

    await expect(app.importConfigFileInput).toHaveAttribute('tabindex', '-1');
    await expect(app.copyShareLinkButton).toBeVisible();
    await expect(app.exportConfigButton).toBeVisible();
    await expect(app.importConfigButton).toBeVisible();
  });
});

test.describe('accessibility scan with a notice visible (axe-core)', () => {
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

  async function openLinkWithFieldIssue(page: Page): Promise<AppPage> {
    const app = new AppPage(page);
    const c = encodeConfigPatch({ shape: 'triangle', cornerRadius: 30 });
    await page.goto(`/#c=${c}`);
    await expect(app.notice).toBeVisible();
    return app;
  }

  test('no serious/critical violations, light theme', async ({ page }) => {
    await openLinkWithFieldIssue(page);
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  test('no serious/critical violations, dark theme', async ({ page }) => {
    const app = await openLinkWithFieldIssue(page);
    await app.darkModeToggle.click();
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
