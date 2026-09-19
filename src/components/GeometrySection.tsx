import { clamp, MAX_CONTENT_SIZE } from '@/core';
import type { NinePatchConfig, Shape } from '@/core';
import { NumberField } from './NumberField';
import { Section } from './Section';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';
import { ShapeIcon } from './ShapeIcon';
import { SliderField } from './SliderField';

const SHAPES: SegmentedOption<Shape>[] = [
  { value: 'rounded', label: 'Rounded rectangle', icon: <ShapeIcon shape="rounded" /> },
  { value: 'pill', label: 'Pill', icon: <ShapeIcon shape="pill" /> },
  { value: 'ellipse', label: 'Ellipse', icon: <ShapeIcon shape="ellipse" /> },
  { value: 'rectangle', label: 'Rectangle', icon: <ShapeIcon shape="rectangle" /> },
];

interface GeometrySectionProps {
  config: NinePatchConfig;
  radius: number;
  maxRadius: number;
  onChange: (patch: Partial<NinePatchConfig>) => void;
  onDimensionChange: (key: 'contentWidth' | 'contentHeight', value: number) => void;
}

export function GeometrySection({ config, radius, maxRadius, onChange, onDimensionChange }: GeometrySectionProps) {
  const rounded = config.shape === 'rounded';
  return (
    <Section title="Geometry">
      <SegmentedControl label="Shape" value={config.shape} options={SHAPES} onChange={(shape) => onChange({ shape })} />
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Width (px)"
          value={config.contentWidth}
          min={1}
          max={MAX_CONTENT_SIZE}
          onChange={(v) => onDimensionChange('contentWidth', v)}
        />
        <NumberField
          label="Height (px)"
          value={config.contentHeight}
          min={1}
          max={MAX_CONTENT_SIZE}
          onChange={(v) => onDimensionChange('contentHeight', v)}
        />
      </div>
      <SliderField
        label={`Corner radius (px)${rounded ? '' : ' — auto for this shape'}`}
        sliderLabel="Adjust corner radius"
        value={rounded ? clamp(config.cornerRadius, 0, maxRadius) : radius}
        min={0}
        max={maxRadius}
        disabled={!rounded}
        onChange={(v) => onChange({ cornerRadius: clamp(v, 0, maxRadius) })}
      />
    </Section>
  );
}
