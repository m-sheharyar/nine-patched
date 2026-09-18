import type { FillType, NinePatchConfig } from '@/core';
import { ColorField } from './ColorField';
import { Field } from './Field';
import { GradientEditor } from './GradientEditor';
import { NumberField } from './NumberField';
import { Section } from './Section';
import { inputCls } from './styles';

interface FillSectionProps {
  config: NinePatchConfig;
  maxRadius: number;
  onChange: (patch: Partial<NinePatchConfig>) => void;
}

export function FillSection({ config, maxRadius, onChange }: FillSectionProps) {
  return (
    <Section title="Fill, background & border">
      <Field label="Fill type">
        {(id) => (
          <select id={id} value={config.fillType} onChange={(e) => onChange({ fillType: e.target.value as FillType })} className={inputCls}>
            <option value="solid">Solid color</option>
            <option value="gradient">Linear gradient</option>
          </select>
        )}
      </Field>

      {config.fillType === 'gradient' ? (
        <GradientEditor
          stops={config.gradientStops}
          angle={config.gradientAngle}
          onAngle={(v) => onChange({ gradientAngle: v })}
          onChange={(stops) => onChange({ gradientStops: stops })}
        />
      ) : (
        <div className="grid grid-cols-2 items-end gap-3">
          <ColorField label="Fill color" value={config.fillColor} onChange={(v) => onChange({ fillColor: v })} />
          <NumberField label="Opacity (%)" value={config.fillOpacity} min={0} max={100} onChange={(v) => onChange({ fillOpacity: v })} />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input id="bg-transparent" type="checkbox" checked={config.bgTransparent} onChange={(e) => onChange({ bgTransparent: e.target.checked })} className="h-4 w-4 cursor-pointer" />
        <label htmlFor="bg-transparent" className="text-sm text-slate-700 dark:text-slate-300">Transparent background</label>
      </div>
      {!config.bgTransparent && <ColorField label="Background color" value={config.backgroundColor} onChange={(v) => onChange({ backgroundColor: v })} />}

      <div className="grid grid-cols-2 items-end gap-3">
        <NumberField label="Border width (px)" value={config.borderWidth} min={0} max={maxRadius} onChange={(v) => onChange({ borderWidth: v })} />
        <ColorField label="Border color" value={config.borderColor} onChange={(v) => onChange({ borderColor: v })} />
      </div>
    </Section>
  );
}
