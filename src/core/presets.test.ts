import { describe, expect, it } from 'vitest';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { parseConfig } from './config';
import { DEFAULT_CONFIG } from './defaults';
import { findActivePreset, PRESETS, presetConfig } from './presets';
import type { Preset } from './presets';
import { ninePatchWarnings } from './warnings';

/** Typed out from the spec table (`feature-2-presets.md`), not read off `PRESETS` itself. */
const SPEC_PRESETS: Preset[] = [
  {
    id: 'focus-ring',
    label: 'Focus ring',
    fileName: 'focus_ring',
    patch: { contentWidth: 48, contentHeight: 48, cornerRadius: 12, fillOpacity: 0, borderWidth: 4, borderColor: '#ffffff' },
  },
  {
    id: 'button',
    label: 'Button',
    fileName: 'button',
    patch: { contentWidth: 48, contentHeight: 48, cornerRadius: 8, fillColor: '#ffffff' },
  },
  {
    id: 'ghost-button',
    label: 'Ghost button',
    fileName: 'ghost_button',
    patch: {
      contentWidth: 48,
      contentHeight: 48,
      cornerRadius: 8,
      fillColor: '#ffffff',
      fillOpacity: 20,
      borderWidth: 2,
      borderColor: '#ffffff',
    },
  },
  {
    id: 'pill',
    label: 'Pill',
    fileName: 'pill',
    patch: { shape: 'pill', contentWidth: 96, contentHeight: 48, fillColor: '#ffffff' },
  },
  {
    id: 'card',
    label: 'Card',
    fileName: 'card',
    patch: { contentWidth: 64, contentHeight: 64, cornerRadius: 16, fillColor: '#1f1f23', borderWidth: 1, borderColor: '#3f3f46' },
  },
];

describe('PRESETS', () => {
  it('matches the spec table exactly, in order', () => {
    expect(PRESETS).toEqual(SPEC_PRESETS);
  });

  it('has unique kebab-case ids and unique file names untouched by sanitizeFileName', () => {
    const ids = PRESETS.map((p) => p.id);
    const fileNames = PRESETS.map((p) => p.fileName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(fileNames).size).toBe(fileNames.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    for (const fileName of fileNames) expect(sanitizeFileName(fileName, 'fallback')).toBe(fileName);
  });

  it.each(SPEC_PRESETS)('$label: patch parses with zero issues and renders zero warnings', (preset) => {
    expect(parseConfig(preset.patch).issues).toEqual([]);
    expect(ninePatchWarnings(presetConfig(preset))).toEqual([]);
  });

  it.each(SPEC_PRESETS)('$label: presetConfig shares no references with DEFAULT_CONFIG', (preset) => {
    const config = presetConfig(preset);
    expect(config).not.toBe(DEFAULT_CONFIG);
    expect(config.stretch).not.toBe(DEFAULT_CONFIG.stretch);
    expect(config.content).not.toBe(DEFAULT_CONFIG.content);
    expect(config.gradientStops).not.toBe(DEFAULT_CONFIG.gradientStops);
  });
});

describe('findActivePreset', () => {
  it('returns null for the default config', () => {
    expect(findActivePreset(DEFAULT_CONFIG)).toBeNull();
  });

  it.each(SPEC_PRESETS)('finds $label from its own config', (preset) => {
    expect(findActivePreset(presetConfig(preset))).toEqual(preset);
  });

  it.each(SPEC_PRESETS)('returns null for $label with one field changed', (preset) => {
    const changed = { ...presetConfig(preset), contentWidth: presetConfig(preset).contentWidth + 1 };
    expect(findActivePreset(changed)).toBeNull();
  });
});
