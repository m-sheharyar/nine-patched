import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';

test.use({ colorScheme: 'light' });

test('a custom file name is used for the download', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setFileName('my-custom-name');

  const { suggestedFilename } = await app.downloadNinePatch();
  expect(suggestedFilename).toBe('my-custom-name.9.png');
});

test('an empty file name falls back to nine_patch.9.png', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setFileName('');

  const { suggestedFilename } = await app.downloadNinePatch();
  expect(suggestedFilename).toBe('nine_patch.9.png');
});

// The app itself never sanitises the file name (see downloadCanvasAsPng.ts) — this currently
// passes only because Chromium sanitises '/' and ':' out of the `download` attribute itself
// before the download fires. Not marked as a known-bug test; see the report for details.
test('a file name with path separators and a colon is sanitised on download', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setFileName('my/asset:v2');

  const { suggestedFilename } = await app.downloadNinePatch();
  expect(suggestedFilename).toBe('my_asset_v2.9.png');
});

// Known bug: `fileName || DEFAULT_FILE_NAME` treats a whitespace-only string as truthy, so it
// is used as-is instead of falling back to the default.
test.fail('a whitespace-only file name falls back to nine_patch.9.png', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setFileName('   ');

  const { suggestedFilename } = await app.downloadNinePatch();
  expect(suggestedFilename).toBe('nine_patch.9.png');
});
