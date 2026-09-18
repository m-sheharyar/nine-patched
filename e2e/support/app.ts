import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { decodePng, type DecodedPng } from './ninePatch';

export interface DownloadedNinePatch {
  suggestedFilename: string;
  png: DecodedPng;
}

/**
 * Page object for the nine-patched app. Only depends on selectors that stay
 * stable across the in-flight src/App.tsx refactor (heading, canvas, and the
 * two named buttons). Field interaction methods land in the next phase, once
 * `<label htmlFor>` associations exist and `getByLabel` is safe to use.
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

  async goto(): Promise<void> {
    await this.page.goto('/');
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
}
