import { PRESETS, presetConfig } from '@/core';
import type { Preset } from '@/core';
import { PresetThumbnail } from './PresetThumbnail';
import { Section } from './Section';
import { focusRing } from './styles';

interface PresetsSectionProps {
  activePreset: Preset | null;
  onApply: (preset: Preset) => void;
}

const tileCls =
  'flex flex-col items-center gap-1 rounded border border-zinc-200 bg-white p-1.5 ' +
  'transition-colors hover:border-zinc-300 hover:bg-zinc-100 ' +
  'aria-pressed:border-zinc-900 aria-pressed:bg-zinc-200 ' +
  'dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 ' +
  'dark:aria-pressed:border-zinc-100 dark:aria-pressed:bg-zinc-700 ' +
  focusRing;

/** Built once: a fresh config per render would make every thumbnail redraw on every inspector edit. */
const THUMBNAILS = PRESETS.map((preset) => ({ preset, config: presetConfig(preset) }));

export function PresetsSection({ activePreset, onApply }: PresetsSectionProps) {
  return (
    <Section title="Presets">
      <div className="grid grid-cols-3 gap-2">
        {THUMBNAILS.map(({ preset, config }) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={activePreset?.id === preset.id}
            aria-label={`Apply ${preset.label} preset`}
            onClick={() => onApply(preset)}
            className={tileCls}
          >
            <PresetThumbnail config={config} />
            <span className="truncate text-[11px] text-zinc-700 dark:text-zinc-300">{preset.label}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}
