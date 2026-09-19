import type { NinePatchConfig, Preset, ResolvedNinePatch } from '@/core';
import { FillSection } from './FillSection';
import { GeometrySection } from './GeometrySection';
import { PresetsSection } from './PresetsSection';
import { RegionsSection } from './RegionsSection';

interface InspectorProps {
  config: NinePatchConfig;
  resolved: ResolvedNinePatch;
  activePreset: Preset | null;
  onChange: (patch: Partial<NinePatchConfig>) => void;
  onDimensionChange: (key: 'contentWidth' | 'contentHeight', value: number) => void;
  onApplyPreset: (preset: Preset) => void;
}

export function Inspector({
  config,
  resolved,
  activePreset,
  onChange,
  onDimensionChange,
  onApplyPreset,
}: InspectorProps) {
  return (
    <aside
      aria-label="Inspector"
      className={
        'w-full shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ' +
        'lg:w-[340px] lg:overflow-y-auto lg:border-t-0 lg:border-l'
      }
    >
      <PresetsSection activePreset={activePreset} onApply={onApplyPreset} />
      <GeometrySection
        config={config}
        radius={resolved.radius}
        maxRadius={resolved.maxRadius}
        onChange={onChange}
        onDimensionChange={onDimensionChange}
      />
      <FillSection config={config} maxRadius={resolved.maxRadius} onChange={onChange} />
      <RegionsSection config={config} stretch={resolved.stretch} content={resolved.content} onChange={onChange} />
    </aside>
  );
}
