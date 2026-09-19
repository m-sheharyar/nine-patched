import { Plus, Trash2 } from 'lucide-react';
import { cssGradient, insertGradientStop, MAX_GRADIENT_STOPS, type GradientStop } from '@/core';
import { ColorField } from './ColorField';
import { NumberField } from './NumberField';
import { SliderField } from './SliderField';
import { buttonCls, iconButtonCls } from './styles';

interface GradientEditorProps {
  stops: GradientStop[];
  angle: number;
  onAngle: (v: number) => void;
  onChange: (stops: GradientStop[]) => void;
}

export function GradientEditor({ stops, angle, onAngle, onChange }: GradientEditorProps) {
  const updateStop = (i: number, patch: Partial<GradientStop>) =>
    onChange(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const atStopLimit = stops.length >= MAX_GRADIENT_STOPS;
  const addStop = () => onChange(insertGradientStop(stops));
  const removeStop = (i: number) => {
    if (stops.length > 2) onChange(stops.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div className="checkerboard checkerboard-sm rounded border border-zinc-200 p-1 dark:border-zinc-800">
        <div className="h-5 w-full rounded-sm" style={{ backgroundImage: cssGradient(angle, stops) }} />
      </div>

      <SliderField
        label="Angle (°, CSS/Figma)"
        sliderLabel="Adjust gradient angle"
        value={angle}
        min={0}
        max={360}
        float
        onChange={onAngle}
      />

      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={i} className="rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400">Stop {i + 1}</span>
              <button
                type="button"
                onClick={() => removeStop(i)}
                disabled={stops.length <= 2}
                aria-label={`Remove stop ${i + 1}`}
                title={`Remove stop ${i + 1}`}
                className={`${iconButtonCls} h-6 w-6`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <ColorField label="Color" value={s.color} onChange={(v) => updateStop(i, { color: v })} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumberField
                label="Position (%)"
                value={s.position}
                min={0}
                max={100}
                float
                onChange={(v) => updateStop(i, { position: v })}
              />
              <NumberField
                label="Opacity (%)"
                value={s.opacity}
                min={0}
                max={100}
                onChange={(v) => updateStop(i, { opacity: v })}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStop}
        disabled={atStopLimit}
        className={buttonCls}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add stop
      </button>
      {/* Visible text, not a title: a disabled button takes no pointer events, so a tooltip never shows. */}
      {atStopLimit && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Limit of {MAX_GRADIENT_STOPS} stops reached.</p>
      )}
    </div>
  );
}
