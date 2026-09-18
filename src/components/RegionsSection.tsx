import type { NinePatchConfig, Region } from '@/core';
import { RegionEditor } from './RegionEditor';
import { Section } from './Section';

interface RegionsSectionProps {
  config: NinePatchConfig;
  stretch: Region;
  content: Region;
  onChange: (patch: Partial<NinePatchConfig>) => void;
}

export function RegionsSection({ config, stretch, content, onChange }: RegionsSectionProps) {
  return (
    <Section title="9-Patch regions">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Coordinates are relative to the content area ({config.contentWidth} × {config.contentHeight}). The stretch box drives the top &amp; left markers; the content/padding box drives the bottom &amp; right markers. With <strong>Auto</strong> on, a box follows the corner radius and size automatically.
      </p>

      <RegionEditor
        title="Stretch region (top & left)"
        enabled={config.stretchEnabled}
        auto={config.stretchAuto}
        region={stretch}
        maxW={config.contentWidth}
        maxH={config.contentHeight}
        onToggleEnabled={(v) => onChange({ stretchEnabled: v })}
        onSetAuto={(on) => onChange(on ? { stretchAuto: true } : { stretchAuto: false, stretch })}
        onChange={(r) => onChange({ stretch: r, stretchAuto: false })}
      />
      <RegionEditor
        title="Content / padding region (bottom & right)"
        enabled={config.contentEnabled}
        auto={config.contentAuto}
        region={content}
        maxW={config.contentWidth}
        maxH={config.contentHeight}
        onToggleEnabled={(v) => onChange({ contentEnabled: v })}
        onSetAuto={(on) => onChange(on ? { contentAuto: true } : { contentAuto: false, content })}
        onChange={(r) => onChange({ content: r, contentAuto: false })}
      />
    </Section>
  );
}
