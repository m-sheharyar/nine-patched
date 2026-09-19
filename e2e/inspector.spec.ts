import { expect, test } from '@playwright/test';
import { AppPage, type SectionTitle } from './support/app';
import { getPixel, readMarkers } from './support/ninePatch';

test.use({ colorScheme: 'light' });

test.describe('slider / number field sync', () => {
  test('corner radius: ArrowRight, Home and End on the slider update the number field and the export', async ({
    page,
  }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setSize(80, 80); // not the default: keeps the max radius (40) large enough for End below

    const slider = app.slider('Adjust corner radius');
    const field = app.cornerRadiusField;

    await expect(slider).toHaveAttribute('aria-valuenow', '8');
    await expect(field).toHaveValue('8');

    await slider.focus();
    await slider.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '9');
    await expect(field).toHaveValue('9');

    await slider.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '40');
    await expect(field).toHaveValue('40');

    // Radius 40 on an 80x80 square is a full circle: the content corner falls outside it.
    const { png } = await app.downloadNinePatch();
    expect(getPixel(png, 1, 1).a).toBe(0);

    await slider.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect(field).toHaveValue('0');
  });

  test('typing into the corner radius field moves the slider', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setSize(80, 80); // not the default: room for a corner radius of 25

    await app.setCornerRadius(25);
    await expect(app.slider('Adjust corner radius')).toHaveAttribute('aria-valuenow', '25');
  });

  test('the corner radius max follows the size, clamping the display without losing the stored value', async ({
    page,
  }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setSize(80, 80); // not the default: room for a corner radius of 25 before it shrinks below

    const slider = app.slider('Adjust corner radius');
    await app.setCornerRadius(25);

    await app.setSize(10, 10);
    await expect(slider).toHaveAttribute('aria-valuemax', '5');
    await expect(slider).toHaveAttribute('aria-valuenow', '5');
    await expect(app.cornerRadiusField).toHaveValue('5');

    await app.setSize(80, 80);
    await expect(slider).toHaveAttribute('aria-valuenow', '25');
    await expect(app.cornerRadiusField).toHaveValue('25');
  });

  test('the corner radius slider is disabled for non-rounded shapes', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    const slider = app.slider('Adjust corner radius');

    await expect(slider).toBeEnabled();
    for (const shape of ['pill', 'ellipse', 'rectangle'] as const) {
      await app.setShape(shape);
      await expect(slider).toBeDisabled();
    }

    await app.setShape('rounded');
    await expect(slider).toBeEnabled();
  });

  test('fill opacity slider stays in sync with its number field', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const slider = app.slider('Adjust fill opacity');
    const field = page.getByLabel('Opacity (%)', { exact: true });

    await slider.focus();
    await slider.press('Home');
    await expect(field).toHaveValue('0');
    await slider.press('End');
    await expect(field).toHaveValue('100');

    await field.fill('42');
    await field.blur();
    await expect(slider).toHaveAttribute('aria-valuenow', '42');
  });

  test('border width slider stays in sync with its number field', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const slider = app.slider('Adjust border width');
    const field = page.getByLabel('Border width (px)', { exact: true });

    await slider.focus();
    await slider.press('ArrowRight');
    await expect(field).toHaveValue('1');

    await field.fill('10');
    await field.blur();
    await expect(slider).toHaveAttribute('aria-valuenow', '10');
  });

  test('gradient angle slider stays in sync with its number field', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setFillType('gradient');

    const slider = app.slider('Adjust gradient angle');
    const field = page.getByLabel('Angle (°, CSS/Figma)', { exact: true });

    await expect(field).toHaveValue('180');
    await slider.focus();
    await slider.press('Home');
    await expect(field).toHaveValue('0');

    await field.fill('270');
    await field.blur();
    await expect(slider).toHaveAttribute('aria-valuenow', '270');
  });
});

test.describe('radio groups', () => {
  test('arrow key navigation changes the shape, and exactly one radio stays checked', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await app.shapeRadio('rounded').focus();
    await expect(app.shapeRadio('rounded')).toBeChecked();

    await page.keyboard.press('ArrowRight');
    await expect(app.shapeRadio('pill')).toBeChecked();

    await page.keyboard.press('ArrowRight');
    await expect(app.shapeRadio('ellipse')).toBeChecked();

    await page.keyboard.press('ArrowRight');
    await expect(app.shapeRadio('rectangle')).toBeChecked();

    await page.keyboard.press('ArrowLeft');
    await expect(app.shapeRadio('ellipse')).toBeChecked();

    const checked = page.getByRole('radiogroup', { name: 'Shape' }).getByRole('radio', { checked: true });
    await expect(checked).toHaveCount(1);
  });

  test('arrow key navigation changes the fill type, and exactly one radio stays checked', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await app.fillTypeRadio('solid').focus();
    await expect(app.fillTypeRadio('solid')).toBeChecked();

    await page.keyboard.press('ArrowRight');
    await expect(app.fillTypeRadio('gradient')).toBeChecked();

    const checked = page.getByRole('radiogroup', { name: 'Fill type' }).getByRole('radio', { checked: true });
    await expect(checked).toHaveCount(1);
  });
});

test.describe('collapsible sections', () => {
  const TITLES: SectionTitle[] = ['Geometry', 'Fill, background & border', '9-Patch regions'];

  test('a summary toggles its section, and field values survive a collapse/expand cycle', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.setSize(80, 80); // not the default: room for a corner radius of 30
    await app.setCornerRadius(30);

    const details = app.sectionDetails('Geometry');
    await expect(details).toHaveJSProperty('open', true);

    await app.sectionSummary('Geometry').click();
    await expect(details).toHaveJSProperty('open', false);
    await expect(app.widthField).toBeHidden();

    await app.sectionSummary('Geometry').click();
    await expect(details).toHaveJSProperty('open', true);
    await expect(app.widthField).toBeVisible();
    await expect(app.cornerRadiusField).toHaveValue('30');
  });

  test('all three sections start open and collapse independently', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    for (const title of TITLES) {
      await expect(app.sectionDetails(title)).toHaveJSProperty('open', true);
    }

    await app.sectionSummary('Fill, background & border').click();
    await expect(app.sectionDetails('Fill, background & border')).toHaveJSProperty('open', false);
    await expect(app.sectionDetails('Geometry')).toHaveJSProperty('open', true);
    await expect(app.sectionDetails('9-Patch regions')).toHaveJSProperty('open', true);
  });
});

test.describe('Reset', () => {
  test('restores every default after changing shape, size, fill, border, regions and file name', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await app.setShape('rectangle');
    await app.setSize(150, 60);
    await app.setFillType('gradient');
    await app.setGradientAngle(45);
    await app.setFillType('solid');
    await app.setBorder(5, '#ff00ff');
    await app.toggleRegionAuto('stretch');
    await app.setRegion('stretch', { x: 5, y: 5, w: 10, h: 10 });
    await app.setFileName('custom-name');

    await app.resetButton.click();

    await expect(app.shapeRadio('rounded')).toBeChecked();
    await expect(app.fillTypeRadio('solid')).toBeChecked();
    await expect(app.fileNameField).toHaveValue('nine_patch');

    const { suggestedFilename, png } = await app.downloadNinePatch();
    expect(suggestedFilename).toBe('nine_patch.9.png');
    // Default content 64x32 plus a 1px frame on each side.
    expect(png.width).toBe(66);
    expect(png.height).toBe(34);

    // Auto stretch/content region for the default (64x32, radius 8) is { x: 8, y: 8, w: 48, h: 16 },
    // offset by the 1px frame.
    const markers = readMarkers(png);
    expect(markers.top).toEqual([{ start: 9, end: 56 }]);
    expect(markers.bottom).toEqual([{ start: 9, end: 56 }]);
    expect(markers.left).toEqual([{ start: 9, end: 24 }]);
    expect(markers.right).toEqual([{ start: 9, end: 24 }]);
    expect(getPixel(png, 33, 17)).toEqual({ r: 0x4c, g: 0xaf, b: 0x50, a: 255 });
  });

  test('does not change the zoom level or the Show guides state', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    await app.zoomOutButton.click();
    const zoomBefore = await app.zoomLevel();
    await app.showGuidesCheckbox.uncheck();

    await app.setSize(200, 200);
    await app.resetButton.click();

    expect(await app.zoomLevel()).toBe(zoomBefore);
    await expect(app.fitButton).toHaveAttribute('aria-pressed', 'false');
    await expect(app.showGuidesCheckbox).not.toBeChecked();
  });
});
