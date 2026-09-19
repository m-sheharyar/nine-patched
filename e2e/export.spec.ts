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

// Sanitised by the app (see sanitizeFileName.ts) rather than by the browser: Chromium happens to
// strip '/' and ':' from the `download` attribute too, so this only proves the combined result.
test('a file name with path separators and a colon is sanitised on download', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setFileName('my/asset:v2');

  const { suggestedFilename } = await app.downloadNinePatch();
  expect(suggestedFilename).toBe('my_asset_v2.9.png');
});

test('a whitespace-only file name falls back to nine_patch.9.png', async ({ page }) => {
  const app = new AppPage(page);
  await app.goto();
  await app.setFileName('   ');

  const { suggestedFilename } = await app.downloadNinePatch();
  expect(suggestedFilename).toBe('nine_patch.9.png');
});
