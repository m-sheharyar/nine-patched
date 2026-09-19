import { DEFAULT_FILE_NAME, PRESETS } from '@/core';
import type { Preset } from '@/core';

/**
 * The file name to show after applying `preset`. A name the user actually typed is left alone;
 * a name that was itself a preset's (the default included) hops to the new preset's name too.
 */
export function nameAfterPreset(currentName: string, preset: Preset): string {
  const trimmed = currentName.trim();
  const wasPresetName = trimmed === DEFAULT_FILE_NAME || PRESETS.some((p) => p.fileName === trimmed);
  return trimmed === '' || wasPresetName ? preset.fileName : currentName;
}
