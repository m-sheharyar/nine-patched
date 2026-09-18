import { expect, test } from '@playwright/test';
import { AppPage } from './support/app';

test.describe('theme persistence', () => {
  test.use({ colorScheme: 'dark' });

  test('loading with a dark system preference does not write localStorage before the user acts', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await app.themeStorage()).toBeNull();
  });

  test('a user who never toggled sees a later system preference change to light', async ({ page, context }) => {
    const app = new AppPage(page);
    await app.goto(); // dark system preference, never toggled

    const page2 = await context.newPage();
    await page2.emulateMedia({ colorScheme: 'light' });
    await page2.goto('/');
    await expect(page2.locator('html')).not.toHaveClass(/dark/);
  });

  test('a live system preference change is followed until the user toggles', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).not.toHaveClass(/dark/);
    expect(await app.themeStorage()).toBeNull();
  });

  test('an explicit toggle is stored and survives a later system preference change', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    await app.darkModeToggle.click(); // explicit choice: light, against a dark system preference
    await expect(html).not.toHaveClass(/dark/);
    expect(await app.themeStorage()).toBe('light');

    // Away and back, so the media query really fires a change the stored choice has to beat.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html).not.toHaveClass(/dark/);
    expect(await app.themeStorage()).toBe('light');

    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });
});
