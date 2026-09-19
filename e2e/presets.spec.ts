import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { AppPage, type Shape } from './support/app';
import { getPixel } from './support/ninePatch';

test.use({ colorScheme: 'light' });

// Copied from share.spec.ts (not imported), to keep this file self-contained.
function encodeConfigPatch(patch: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(patch)).toString('base64url');
}

function decodeConfigFromUrl(url: string): Record<string, unknown> {
  const hash = new URL(url, 'http://placeholder').hash.replace(/^#/, '');
  const c = new URLSearchParams(hash).get('c');
  if (!c) return {};
  return JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));
}

// specs/feature-2-presets.md § Presets. Typed here, not read from `src/`.
interface PresetCase {
  label: string;
  patch: Record<string, unknown>;
}

const PRESETS: PresetCase[] = [
  { label: 'Focus ring', patch: { contentWidth: 48, contentHeight: 48, cornerRadius: 12, fillOpacity: 0, borderWidth: 4, borderColor: '#ffffff' } },
  { label: 'Button', patch: { contentWidth: 48, contentHeight: 48, cornerRadius: 8, fillColor: '#ffffff' } },
  { label: 'Ghost button', patch: { contentWidth: 48, contentHeight: 48, cornerRadius: 8, fillColor: '#ffffff', fillOpacity: 20, borderWidth: 2, borderColor: '#ffffff' } },
  { label: 'Pill', patch: { shape: 'pill', contentWidth: 96, contentHeight: 48, fillColor: '#ffffff' } },
  { label: 'Card', patch: { contentWidth: 64, contentHeight: 64, cornerRadius: 16, fillColor: '#1f1f23', borderWidth: 1, borderColor: '#3f3f46' } },
];

const PRESET_LABELS = PRESETS.map((p) => p.label);

/** One assertion per possible patch key, so row 1 can check exactly the fields each preset patches. */
const FIELD_ASSERTIONS: Record<string, (app: AppPage, page: Page, value: unknown) => Promise<void>> = {
  contentWidth: (app, _page, value) => expect(app.widthField).toHaveValue(String(value)),
  contentHeight: (app, _page, value) => expect(app.heightField).toHaveValue(String(value)),
  cornerRadius: (app, _page, value) => expect(app.cornerRadiusField).toHaveValue(String(value)),
  fillOpacity: (_app, page, value) => expect(page.getByLabel('Opacity (%)', { exact: true })).toHaveValue(String(value)),
  borderWidth: (_app, page, value) => expect(page.getByLabel('Border width (px)', { exact: true })).toHaveValue(String(value)),
  fillColor: (_app, page, value) => expect(page.getByLabel('Fill color', { exact: true })).toHaveValue(String(value)),
  borderColor: (_app, page, value) => expect(page.getByLabel('Border color', { exact: true })).toHaveValue(String(value)),
  shape: (app, _page, value) => expect(app.shapeRadio(value as Shape)).toBeChecked(),
};

async function assertPatchedFields(app: AppPage, page: Page, patch: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(patch)) {
    const assertion = FIELD_ASSERTIONS[key];
    if (!assertion) throw new Error(`presets.spec.ts: no field assertion wired for patch key "${key}"`);
    await assertion(app, page, value);
  }
}

async function expectNoPresetPressed(app: AppPage): Promise<void> {
  for (const label of PRESET_LABELS) {
    await expect(app.presetButton(label)).toHaveAttribute('aria-pressed', 'false');
  }
}

// Row 1: each of the five presets, table driven.
for (const preset of PRESETS) {
  test(`applying ${preset.label} sets its patched fields`, async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.presetButton(preset.label).click();
    await assertPatchedFields(app, page, preset.patch);
  });
}

// Row 2: Focus ring (contentWidth/Height 48, borderWidth 4, borderColor white, fillOpacity 0) exports a hollow 9-patch.
test('Focus ring exports a hollow 9-patch with an opaque white border', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.presetButton('Focus ring').click();
  const { png } = await app.downloadNinePatch();

  const centre = getPixel(png, 1 + 24, 1 + 24);
  expect(centre.a).toBe(0);

  const topBorderMiddle = getPixel(png, 1 + 24, 1 + 2);
  expect(topBorderMiddle).toEqual({ r: 255, g: 255, b: 255, a: 255 });
});

// Row 3: applying a preset replaces the whole config, it does not merge onto stale fields.
test('Card replaces fields left stale from a previous edit', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.widthField.fill('200');
  await app.widthField.blur();
  await app.setFillType('gradient');
  await app.presetButton('Card').click();

  await expect(app.widthField).toHaveValue('64');
  await expect(app.fillTypeRadio('solid')).toBeChecked();
});

// Row 4: pressed state follows the config, not which button was last clicked.
test('pressed state follows the config, and clears on the next edit', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.presetButton('Pill').click();

  for (const label of PRESET_LABELS) {
    await expect(app.presetButton(label)).toHaveAttribute('aria-pressed', label === 'Pill' ? 'true' : 'false');
  }

  await app.widthField.fill('97');
  await app.widthField.blur();
  await expectNoPresetPressed(app);
});

// Row 5: a config that arrives via a share link also lights up its matching preset.
test('a shared Button config shows Button pressed, with no notice', async ({ page }) => {
  const buttonPatch = PRESETS.find((p) => p.label === 'Button')!.patch;
  const c = encodeConfigPatch(buttonPatch);
  await page.goto(`/#c=${c}`);
  const app = new AppPage(page);

  await expect(app.presetButton('Button')).toHaveAttribute('aria-pressed', 'true');
  await expect(app.notice).not.toBeVisible();
});

// Row 6: file name rule, three starting names, table driven.
const NAME_RULE_CASES: Array<{ description: string; startName: string | null; expected: string }> = [
  { description: 'the default name', startName: null, expected: 'pill' },
  { description: "another preset's file name (ghost_button)", startName: 'ghost_button', expected: 'pill' },
  { description: 'a name the user typed (my_asset)', startName: 'my_asset', expected: 'my_asset' },
];

for (const { description, startName, expected } of NAME_RULE_CASES) {
  test(`applying Pill from ${description} sets the file name to "${expected}"`, async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    if (startName !== null) await app.setFileName(startName);
    await app.presetButton('Pill').click();

    await expect(app.fileNameField).toHaveValue(expected);
  });
}

// Row 7: Undo restores the config and the name from just before the preset was applied.
test('Undo restores the previous config, name, and clears the notice', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.widthField.fill('123');
  await app.widthField.blur();
  // The name stays at its default on purpose: only then does the preset rename it, so Undo has a name to restore.
  await app.presetButton('Card').click();
  await expect(app.fileNameField).toHaveValue('card');
  await app.undoButton.click();

  await expect(app.widthField).toHaveValue('123');
  await expect(app.fileNameField).toHaveValue('nine_patch');
  await expect(app.notice).not.toBeVisible();
  await expectNoPresetPressed(app);
});

// Row 8: Undo after a second preset returns to the snapshot right before that second preset.
test('Undo after Pill then Card returns to Pill, not the original defaults', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.presetButton('Pill').click();
  await app.presetButton('Card').click();
  await app.undoButton.click();

  await expect(app.presetButton('Pill')).toHaveAttribute('aria-pressed', 'true');
});

// Row 9: the Undo notice text is exact, and clears immediately (not lazily) on the next edit.
test('the Undo notice text is exact, and clears directly on the next edit', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.presetButton('Card').click();

  await expect(app.notice).toContainText('Applied preset: Card');
  await expect(app.undoButton).toBeVisible();

  await app.widthField.fill('999');
  await app.widthField.blur();
  await expect(app.notice).not.toBeVisible();
  await expect(app.undoButton).toHaveCount(0);
});

// Row 10: clicking the already active preset again raises no new notice.
test('clicking the active preset again raises no notice', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.presetButton('Button').click();
  await app.dismissNoticeButton.click();
  await expect(app.notice).not.toBeVisible();
  await app.presetButton('Button').click();

  await expect(app.notice).not.toBeVisible();
});

// Row 11: applying a preset reaches the URL through the existing (debounced) sync.
test('applying Focus ring is reflected in the URL', async ({ page }) => {
  // The URL carries only fields that differ from the defaults, and the preset's radius of 12 is the default.
  const { cornerRadius: _sameAsDefault, ...expected } = PRESETS.find((p) => p.label === 'Focus ring')!.patch;
  const app = new AppPage(page);
  await app.goto();
  await app.presetButton('Focus ring').click();

  await expect.poll(() => decodeConfigFromUrl(page.url())).toEqual(expected);
});

// Row 12: presets are keyboard operable.
test('Tab from the section summary then Enter applies the first preset', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.sectionSummary('Presets').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  await expect(app.presetButton('Focus ring')).toHaveAttribute('aria-pressed', 'true');
});

// Row 13: axe, serious/critical, Presets section visible with the Undo notice showing, light and dark.
test.describe('accessibility scan with the Undo notice visible (axe-core)', () => {
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

  async function openWithUndoNotice(page: Page): Promise<AppPage> {
    const app = new AppPage(page);
    await app.goto();
    await app.presetButton('Card').click();
    await expect(app.undoButton).toBeVisible();
    return app;
  }

  test('no serious/critical violations, light theme', async ({ page }) => {
    await openWithUndoNotice(page);
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  test('no serious/critical violations, dark theme', async ({ page }) => {
    const app = await openWithUndoNotice(page);
    await app.darkModeToggle.click();
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
