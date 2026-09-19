import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { decodePng, type DecodedPng } from './ninePatch';

export interface DownloadedNinePatch {
  suggestedFilename: string;
  png: DecodedPng;
}

// Kept local (rather than imported from `@/core`) so the e2e layer stays decoupled from the
// app's implementation types, the same way `support/ninePatch.ts` stays decoupled from its logic.
export type Shape = 'rounded' | 'pill' | 'ellipse' | 'rectangle';
export type FillType = 'solid' | 'gradient';
export type RegionKind = 'stretch' | 'content';
export interface RegionPatch {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}
export interface GradientStopPatch {
  color?: string;
  position?: number;
  opacity?: number;
}

const REGION_TITLES: Record<RegionKind, string> = {
  stretch: 'Stretch region (top & left)',
  content: 'Content / padding region (bottom & right)',
};

/** Shape and fill type are segmented radio groups; these are the radios' accessible names. */
const SHAPE_LABELS: Record<Shape, string> = {
  rounded: 'Rounded rectangle',
  pill: 'Pill',
  ellipse: 'Ellipse',
  rectangle: 'Rectangle',
};

const FILL_TYPE_LABELS: Record<FillType, string> = {
  solid: 'Solid color',
  gradient: 'Linear gradient',
};

/** The h2 title inside each collapsible `<details>` section of the inspector. */
export type SectionTitle = 'Geometry' | 'Fill, background & border' | '9-Patch regions';

/** One of the four keyboard-operable Radix sliders in the inspector. */
export type SliderName = 'Adjust corner radius' | 'Adjust fill opacity' | 'Adjust gradient angle' | 'Adjust border width';

/**
 * Page object for the nine-patched app. Selectors rely on `<label htmlFor>` association
 * (`getByLabel`) wherever the field has one, so they track the visible UI text rather than
 * markup structure. Color fields render both a hex text input and a swatch sharing a label
 * prefix, so every color lookup passes `{ exact: true }` to avoid matching the swatch's
 * "<label> picker" aria-label.
 */
export class AppPage {
  constructor(private readonly page: Page) {}

  get heading() {
    return this.page.getByRole('heading', { name: 'nine-patched' });
  }

  get canvas() {
    return this.page.locator('canvas');
  }

  get downloadButton() {
    return this.page.getByRole('button', { name: 'Download 9-Patch PNG' });
  }

  get darkModeToggle() {
    return this.page.getByRole('button', { name: 'Toggle dark mode' });
  }

  get widthField(): Locator {
    return this.page.getByLabel('Width (px)', { exact: true });
  }

  get heightField(): Locator {
    return this.page.getByLabel('Height (px)', { exact: true });
  }

  /** Label text gains a " — auto for this shape" suffix for non-rounded shapes. */
  get cornerRadiusField(): Locator {
    return this.page.getByLabel(/^Corner radius \(px\)/);
  }

  /** All warnings currently shown in the workspace status line. */
  get warnings(): Locator {
    return this.page.getByRole('list', { name: 'Warnings' }).getByRole('listitem');
  }

  get addGradientStopButton(): Locator {
    return this.page.getByRole('button', { name: 'Add stop' });
  }

  /** One "Remove stop" button per gradient stop; also useful for asserting stop count. */
  get gradientStopRemoveButtons(): Locator {
    return this.page.getByRole('button', { name: /^Remove stop \d+$/ });
  }

  get resetButton(): Locator {
    return this.page.getByRole('button', { name: 'Reset', exact: true });
  }

  get zoomOutButton(): Locator {
    return this.page.getByRole('button', { name: 'Zoom out' });
  }

  get zoomInButton(): Locator {
    return this.page.getByRole('button', { name: 'Zoom in' });
  }

  /** Also exposes `aria-pressed`, true while zoom follows the stage size. */
  get fitButton(): Locator {
    return this.page.getByRole('button', { name: 'Fit', exact: true });
  }

  get zoomLevelStatus(): Locator {
    return this.page.getByRole('status', { name: 'Zoom level' });
  }

  get showGuidesCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: 'Show guides' });
  }

  /** The SVG guide overlay's root; `aria-hidden` and non-interactive, so located by test id. */
  get guideOverlay(): Locator {
    return this.page.getByTestId('guide-overlay');
  }

  get workspace(): Locator {
    return this.page.getByRole('region', { name: 'Workspace' });
  }

  get inspector(): Locator {
    return this.page.getByRole('complementary', { name: 'Inspector' });
  }

  /** The stage's checkerboard backdrop, for reading theme-dependent computed styles. */
  get stageBackground(): Locator {
    return this.workspace.locator('.checkerboard');
  }

  get validStatus(): Locator {
    return this.page.getByText('Valid 9-patch', { exact: true });
  }

  get fileNameField(): Locator {
    return this.page.getByLabel('File name', { exact: true });
  }

  get copyShareLinkButton(): Locator {
    return this.page.getByRole('button', { name: 'Copy share link', exact: true });
  }

  get exportConfigButton(): Locator {
    return this.page.getByRole('button', { name: 'Export config', exact: true });
  }

  get importConfigButton(): Locator {
    return this.page.getByRole('button', { name: 'Import config', exact: true });
  }

  get importConfigFileInput(): Locator {
    return this.page.getByLabel('Import config file', { exact: true });
  }

  /** The `role="status"` notice strip under the top bar; empty/absent when no notice is shown.
   *  Narrowed to `aria-live="polite"` because `getByRole('status')` alone also matches the
   *  unrelated "Zoom level" status span in the workspace toolbar. */
  get notice(): Locator {
    return this.page.getByRole('status').and(this.page.locator('[aria-live="polite"]'));
  }

  get dismissNoticeButton(): Locator {
    return this.page.getByRole('button', { name: 'Dismiss notice', exact: true });
  }

  /** The read only, prefilled input shown when clipboard copy falls back. */
  get shareLinkInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Share link', exact: true });
  }

  shapeRadio(shape: Shape): Locator {
    return this.radio('Shape', SHAPE_LABELS[shape]);
  }

  fillTypeRadio(type: FillType): Locator {
    return this.radio('Fill type', FILL_TYPE_LABELS[type]);
  }

  slider(name: SliderName): Locator {
    return this.page.getByRole('slider', { name });
  }

  /** The clickable `<summary>` that expands/collapses a section, found via its h2 heading. */
  sectionSummary(title: SectionTitle): Locator {
    return this.page.getByRole('heading', { name: title, level: 2 }).locator('xpath=ancestor::summary[1]');
  }

  /** The section's native `<details>` element, whose `open` property reflects expanded state. */
  sectionDetails(title: SectionTitle): Locator {
    return this.page.getByRole('heading', { name: title, level: 2 }).locator('xpath=ancestor::details[1]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** Parses the `Zoom level` status text (e.g. `5×`) into a number. */
  async zoomLevel(): Promise<number> {
    const text = await this.zoomLevelStatus.textContent();
    return Number.parseInt(text ?? '', 10);
  }

  /** The canvas's `width`/`height` attributes — the pixel size of the export, independent of zoom. */
  async canvasSize(): Promise<{ width: number; height: number }> {
    return this.canvas.evaluate((c) => ({ width: (c as HTMLCanvasElement).width, height: (c as HTMLCanvasElement).height }));
  }

  async downloadNinePatch(): Promise<DownloadedNinePatch> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadButton.click(),
    ]);
    const path = await download.path();
    if (!path) {
      throw new Error('Download event fired but no local file path was available');
    }
    const buffer = await readFile(path);
    return { suggestedFilename: download.suggestedFilename(), png: decodePng(buffer) };
  }

  /** Clicks "Export config" and returns the downloaded document, parsed, plus its suggested name. */
  async downloadConfig(): Promise<{ json: unknown; suggestedFilename: string }> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.exportConfigButton.click(),
    ]);
    const path = await download.path();
    if (!path) {
      throw new Error('Download event fired but no local file path was available');
    }
    const text = await readFile(path, 'utf8');
    return { json: JSON.parse(text), suggestedFilename: download.suggestedFilename() };
  }

  async setShape(shape: Shape): Promise<void> {
    await this.radio('Shape', SHAPE_LABELS[shape]).check();
  }

  /** Number fields commit on change and clamp to `min` on blur; fills then blurs both fields. */
  async setSize(width: number, height: number): Promise<void> {
    await this.fillNumberField(this.widthField, width);
    await this.fillNumberField(this.heightField, height);
  }

  async setCornerRadius(value: number): Promise<void> {
    await this.fillNumberField(this.cornerRadiusField, value);
  }

  async setFillType(type: FillType): Promise<void> {
    await this.radio('Fill type', FILL_TYPE_LABELS[type]).check();
  }

  async setFillColor(hex: string): Promise<void> {
    await this.setColorField('Fill color', hex);
  }

  /** Only valid while fill type is 'solid' — the opacity field is unmounted in gradient mode. */
  async setFillOpacity(value: number): Promise<void> {
    await this.fillNumberField(this.page.getByLabel('Opacity (%)', { exact: true }), value);
  }

  async setBorder(width: number, color?: string): Promise<void> {
    await this.fillNumberField(this.page.getByLabel('Border width (px)', { exact: true }), width);
    if (color !== undefined) {
      await this.setColorField('Border color', color);
    }
  }

  async setBackground(opts: { transparent?: boolean; color?: string }): Promise<void> {
    if (opts.transparent !== undefined) {
      await this.page.getByLabel('Transparent background', { exact: true }).setChecked(opts.transparent);
    }
    if (opts.color !== undefined) {
      await this.setColorField('Background color', opts.color);
    }
  }

  async setFileName(name: string): Promise<void> {
    await this.page.getByLabel('File name', { exact: true }).fill(name);
  }

  async setRegionEnabled(kind: RegionKind, enabled: boolean): Promise<void> {
    await this.regionContainer(kind).getByRole('checkbox').setChecked(enabled);
  }

  async toggleRegionAuto(kind: RegionKind): Promise<void> {
    await this.regionContainer(kind).getByRole('button', { name: /^Auto/ }).click();
  }

  /** Sets only the provided keys; each edit implicitly turns Auto off for that region. */
  async setRegion(kind: RegionKind, region: RegionPatch): Promise<void> {
    const container = this.regionContainer(kind);
    if (region.x !== undefined) await this.fillNumberField(container.getByLabel('X', { exact: true }), region.x);
    if (region.y !== undefined) await this.fillNumberField(container.getByLabel('Y', { exact: true }), region.y);
    if (region.w !== undefined) await this.fillNumberField(container.getByLabel('Width', { exact: true }), region.w);
    if (region.h !== undefined) await this.fillNumberField(container.getByLabel('Height', { exact: true }), region.h);
  }

  async setGradientAngle(deg: number): Promise<void> {
    await this.fillNumberField(this.page.getByLabel('Angle (°, CSS/Figma)', { exact: true }), deg);
  }

  async addGradientStop(): Promise<void> {
    await this.addGradientStopButton.click();
  }

  async removeGradientStop(index: number): Promise<void> {
    await this.page.getByRole('button', { name: `Remove stop ${index + 1}` }).click();
  }

  removeGradientStopButton(index: number): Locator {
    return this.page.getByRole('button', { name: `Remove stop ${index + 1}` });
  }

  async setGradientStop(index: number, patch: GradientStopPatch): Promise<void> {
    const container = this.gradientStopContainer(index);
    if (patch.color !== undefined) {
      await this.setColorFieldIn(container, 'Color', patch.color);
    }
    if (patch.position !== undefined) {
      await this.fillNumberField(container.getByLabel('Position (%)', { exact: true }), patch.position);
    }
    if (patch.opacity !== undefined) {
      await this.fillNumberField(container.getByLabel('Opacity (%)', { exact: true }), patch.opacity);
    }
  }

  /** Locators for reading a stop's current displayed values back (e.g. after reordering). */
  gradientStopFields(index: number): { color: Locator; position: Locator; opacity: Locator } {
    const container = this.gradientStopContainer(index);
    return {
      color: container.getByLabel('Color', { exact: true }),
      position: container.getByLabel('Position (%)', { exact: true }),
      opacity: container.getByLabel('Opacity (%)', { exact: true }),
    };
  }

  async themeStorage(): Promise<string | null> {
    return this.page.evaluate(() => localStorage.getItem('theme'));
  }

  /** One option of a segmented control; exact so "Rectangle" never matches "Rounded rectangle". */
  private radio(group: string, option: string): Locator {
    return this.page.getByRole('radiogroup', { name: group }).getByRole('radio', { name: option, exact: true });
  }

  /** The nearest ancestor `<div>` of a region editor's title that also contains its "X" field. */
  private regionContainer(kind: RegionKind): Locator {
    return this.page
      .getByText(REGION_TITLES[kind], { exact: true })
      .locator('xpath=ancestor::div[.//label[normalize-space()="X"]][1]');
  }

  /** The nearest ancestor `<div>` of a "Stop N" label that also contains its "Color" field. */
  private gradientStopContainer(index: number): Locator {
    return this.page
      .getByText(`Stop ${index + 1}`, { exact: true })
      .locator('xpath=ancestor::div[.//label[normalize-space()="Color"]][1]');
  }

  private async fillNumberField(locator: Locator, value: number, opts: { blur?: boolean } = {}): Promise<void> {
    await locator.fill(String(value));
    if (opts.blur ?? true) await locator.blur();
  }

  private async setColorField(label: string, hex: string): Promise<void> {
    await this.setColorFieldIn(this.page, label, hex);
  }

  private async setColorFieldIn(scope: Page | Locator, label: string, hex: string): Promise<void> {
    const field = scope.getByLabel(label, { exact: true });
    await field.fill(hex);
    await field.blur();
  }
}
