import { Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cssGradient, type GradientStop } from '@/core';
import { ColorField } from './ColorField';
import { NumberField } from './NumberField';

const barChecker: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%)',
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0,0 5px,5px -5px,-5px 0px',
  backgroundColor: '#fff',
};

interface GradientEditorProps {
  stops: GradientStop[];
  angle: number;
  onAngle: (v: number) => void;
  onChange: (stops: GradientStop[]) => void;
}

export function GradientEditor({ stops, angle, onAngle, onChange }: GradientEditorProps) {
  const updateStop = (i: number, patch: Partial<GradientStop>) =>
    onChange(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStop = () => {
    const last = stops[stops.length - 1];
    onChange([...stops, { color: last?.color ?? '#000000', position: 100, opacity: last?.opacity ?? 100 }]);
  };
  const removeStop = (i: number) => {
    if (stops.length > 2) onChange(stops.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <NumberField label="Angle (°, CSS/Figma)" value={angle} min={0} max={360} float onChange={onAngle} />

      <div className="rounded p-1" style={barChecker}>
        <div className="h-6 w-full rounded" style={{ backgroundImage: cssGradient(angle, stops) }} />
      </div>

      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Stop {i + 1}</span>
              <button
                type="button"
                onClick={() => removeStop(i)}
                disabled={stops.length <= 2}
                aria-label={`Remove stop ${i + 1}`}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-500 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <ColorField label="Color" value={s.color} onChange={(v) => updateStop(i, { color: v })} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumberField label="Position (%)" value={s.position} min={0} max={100} float onChange={(v) => updateStop(i, { position: v })} />
              <NumberField label="Opacity (%)" value={s.opacity} min={0} max={100} onChange={(v) => updateStop(i, { opacity: v })} />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStop}
        className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Plus className="h-4 w-4" />
        Add stop
      </button>
    </div>
  );
}
