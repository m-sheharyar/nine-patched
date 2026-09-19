import { describe, expect, it } from 'vitest';
import { DEFAULT_FILE_NAME } from '@/core';
import type { Preset } from '@/core';
import { nameAfterPreset } from './presetName';

const pill: Preset = { id: 'pill', label: 'Pill', fileName: 'pill', patch: { shape: 'pill' } };
const ghostButton: Preset = { id: 'ghost-button', label: 'Ghost button', fileName: 'ghost_button', patch: {} };

describe('nameAfterPreset', () => {
  it.each([
    ['the default name', DEFAULT_FILE_NAME],
    ['the default name padded with spaces', `  ${DEFAULT_FILE_NAME}  `],
    ['a blank name', '   '],
    ['an empty name', ''],
    ["another preset's file name", ghostButton.fileName],
    ["the target preset's own file name", pill.fileName],
  ])('replaces %s with the preset file name', (_label, name) => {
    expect(nameAfterPreset(name, pill)).toBe(pill.fileName);
  });

  it.each([
    ['a name the user typed', 'my_asset'],
    ['a name that merely contains a preset name', 'ghost_buttons'],
    ['a name that differs only in case from a preset name', 'Pill'],
  ])('leaves %s unchanged', (_label, name) => {
    expect(nameAfterPreset(name, pill)).toBe(name);
  });
});
