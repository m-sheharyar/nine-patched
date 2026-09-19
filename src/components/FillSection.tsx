import { useId } from 'react';
import type { FillType, NinePatchConfig } from '@/core';
import { ColorField } from './ColorField';
import { GradientEditor } from './GradientEditor';
import { Section } from './Section';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';
import { SliderField } from './SliderField';
import { checkboxCls } from './styles';

const FILL_TYPES: SegmentedOption<FillType>[] = [
  { value: 'solid', label: 'Solid color' },
  { value: 'gradient', label: 'Linear gradient' },
];

interface FillSectionProps {
  config: NinePatchConfig;
  maxRadius: number;
  onChange: (patch: Partial<NinePatchConfig>) => void;
}

export function FillSection({ config, maxRadius, onChange }: FillSectionProps) {
  const bgTransparentId = useId();

  return (
    <Section title="Fill, background & border">
      <SegmentedControl
        label="Fill type"
        value={config.fillType}
        options={FILL_TYPES}
        onChange={(fillType) => onChange({ fillType })}
      />

      {config.fillType === 'gradient' ? (
        <GradientEditor
          stops={config.gradientStops}
          angle={config.gradientAngle}
          onAngle={(v) => onChange({ gradientAngle: v })}
          onChange={(stops) => onChange({ gradientStops: stops })}
        />
      ) : (
        <>
          <ColorField label="Fill color" value={config.fillColor} onChange={(v) => onChange({ fillColor: v })} />
          <SliderField
            label="Opacity (%)"
            sliderLabel="Adjust fill opacity"
            value={config.fillOpacity}
            min={0}
            max={100}
            onChange={(v) => onChange({ fillOpacity: v })}
          />
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        <input
          id={bgTransparentId}
          type="checkbox"
          checked={config.bgTransparent}
          onChange={(e) => onChange({ bgTransparent: e.target.checked })}
          className={checkboxCls}
        />
        <label htmlFor={bgTransparentId} className="cursor-pointer text-[12px] text-zinc-700 dark:text-zinc-300">
          Transparent background
        </label>
      </div>
      {!config.bgTransparent && (
        <ColorField
          label="Background color"
          value={config.backgroundColor}
          onChange={(v) => onChange({ backgroundColor: v })}
        />
      )}

      <SliderField
        label="Border width (px)"
        sliderLabel="Adjust border width"
        value={config.borderWidth}
        min={0}
        max={maxRadius}
        onChange={(v) => onChange({ borderWidth: v })}
      />
      <ColorField label="Border color" value={config.borderColor} onChange={(v) => onChange({ borderColor: v })} />
    </Section>
  );
}
