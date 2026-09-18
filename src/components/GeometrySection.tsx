import { clamp } from '@/core';
import type { NinePatchConfig, Shape } from '@/core';
import { Field } from './Field';
import { NumberField } from './NumberField';
import { Section } from './Section';
import { inputCls } from './styles';

interface GeometrySectionProps {
  config: NinePatchConfig;
  radius: number;
  maxRadius: number;
  onChange: (patch: Partial<NinePatchConfig>) => void;
  onDimensionChange: (key: 'contentWidth' | 'contentHeight', value: number) => void;
}

export function GeometrySection({ config, radius, maxRadius, onChange, onDimensionChange }: GeometrySectionProps) {
  return (
    <Section title="Geometry">
      <Field label="Shape">
        {(id) => (
          <select id={id} value={config.shape} onChange={(e) => onChange({ shape: e.target.value as Shape })} className={inputCls}>
            <option value="rounded">Rounded rectangle</option>
            <option value="pill">Pill (fully rounded)</option>
            <option value="ellipse">Ellipse / circle</option>
            <option value="rectangle">Rectangle</option>
          </select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Width (px)" value={config.contentWidth} min={1} max={2000} onChange={(v) => onDimensionChange('contentWidth', v)} />
        <NumberField label="Height (px)" value={config.contentHeight} min={1} max={2000} onChange={(v) => onDimensionChange('contentHeight', v)} />
      </div>
      <NumberField
        label={`Corner radius (px)${config.shape !== 'rounded' ? ' — auto for this shape' : ''}`}
        value={config.shape === 'rounded' ? clamp(config.cornerRadius, 0, maxRadius) : radius}
        min={0}
        max={maxRadius}
        disabled={config.shape !== 'rounded'}
        onChange={(v) => onChange({ cornerRadius: clamp(v, 0, maxRadius) })}
      />
    </Section>
  );
}
