import { encodeConfig, parseConfig } from './config';
import type { NinePatchConfig } from './types';

/** A named config patch, kept DOM-free so a future CLI can offer `--preset <id>` too. */
export interface Preset {
  id: string;
  label: string;
  fileName: string;
  patch: Partial<NinePatchConfig>;
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'focus-ring',
    label: 'Focus ring',
    fileName: 'focus_ring',
    patch: {
      contentWidth: 48,
      contentHeight: 48,
      cornerRadius: 12,
      fillOpacity: 0,
      borderWidth: 4,
      borderColor: '#ffffff',
    },
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
    patch: {
      contentWidth: 64,
      contentHeight: 64,
      cornerRadius: 16,
      fillColor: '#1f1f23',
      borderWidth: 1,
      borderColor: '#3f3f46',
    },
  },
];

/**
 * A fresh, full config: `DEFAULT_CONFIG` with the preset's patch applied. Routed through
 * `parseConfig`, so the result shares no references with `DEFAULT_CONFIG` or with the preset.
 */
export function presetConfig(preset: Preset): NinePatchConfig {
  return parseConfig(preset.patch).config;
}

/** Precomputed once: `PRESETS` is static, and this is looked up on every render. */
const PRESET_ENCODINGS: readonly string[] = PRESETS.map((preset) => encodeConfig(presetConfig(preset)));

/** The preset whose config exactly matches, or null. The default config matches no preset. */
export function findActivePreset(config: NinePatchConfig): Preset | null {
  const index = PRESET_ENCODINGS.indexOf(encodeConfig(config));
  return index === -1 ? null : PRESETS[index];
}
