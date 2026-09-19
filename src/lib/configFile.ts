import { DEFAULT_FILE_NAME, parseConfigDocument } from '@/core';
import type { NinePatchConfig } from '@/core';
import { sanitizeFileName } from './sanitizeFileName';

/** 256 KiB. A config document is a few kilobytes; anything larger was never one of ours. */
export const MAX_IMPORT_BYTES = 262144;

/** The cap on a name arriving from a link or a file, long enough for any real file name. */
export const MAX_NAME_LENGTH = 100;

export type ReadConfigResult =
  | { ok: true; name: string; config: NinePatchConfig; issues: string[] }
  | { ok: false };

export function configFileName(name: string): string {
  return `${sanitizeFileName(name, DEFAULT_FILE_NAME)}.9patch.json`;
}

/**
 * The pure half of import: `ok: false` means the text was not a config document at all, so the app
 * should change nothing. Anything that parsed comes back with the fields it lost on the way.
 */
export function readConfigText(text: string): ReadConfigResult {
  const parsed = parseConfigDocument(text);
  if (parsed.issues.some((issue) => issue.startsWith('document:') || issue.startsWith('config:'))) {
    return { ok: false };
  }
  if (parsed.name.length > MAX_NAME_LENGTH) {
    const issues = [...parsed.issues, `name: expected at most ${MAX_NAME_LENGTH} characters`];
    return { ok: true, name: DEFAULT_FILE_NAME, config: parsed.config, issues };
  }
  return { ok: true, name: parsed.name, config: parsed.config, issues: parsed.issues };
}
