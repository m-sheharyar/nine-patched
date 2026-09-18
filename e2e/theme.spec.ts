import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';

test.describe('theme persistence', () => {
  test.use({ colorScheme: 'dark' });

  // Known bug: useTheme's effect writes localStorage on every render, including the initial
  // one, so the system-derived preference is persisted before the user ever touches the toggle.
  test.fail('loading with a dark system preference does not write localStorage before the user acts', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await app.themeStorage()).toBeNull();
  });

  // Known bug: because of the bug above, a later system preference change is never honoured —
  // the wrongly-persisted 'dark' value in localStorage always wins over the system preference.
  test.fail('a user who never toggled sees a later system preference change to light', async ({ page, context }) => {
    const app = new AppPage(page);
    await app.goto(); // dark system preference, never toggled
    // Wait for the (buggy) persist-on-load effect to actually land before racing a second page
    // against it, so this test deterministically exercises "localStorage already has a value".
    await expect.poll(() => app.themeStorage()).not.toBeNull();

    const page2 = await context.newPage();
    await page2.emulateMedia({ colorScheme: 'light' });
    await page2.goto('/');
    await expect(page2.locator('html')).not.toHaveClass(/dark/);
  });
});
