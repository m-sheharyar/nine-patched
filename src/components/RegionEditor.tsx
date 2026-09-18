import type { Region } from '@/core';
import { NumberField } from './NumberField';

interface RegionEditorProps {
  title: string;
  enabled: boolean;
  auto: boolean;
  region: Region;
  maxW: number;
  maxH: number;
  onToggleEnabled: (v: boolean) => void;
  onSetAuto: (on: boolean) => void;
  onChange: (r: Region) => void;
}

export function RegionEditor({
  title, enabled, auto, region, maxW, maxH, onToggleEnabled, onSetAuto, onChange,
}: RegionEditorProps) {
  const set = (patch: Partial<Region>) => onChange({ ...region, ...patch });
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggleEnabled(e.target.checked)} className="h-4 w-4 cursor-pointer" />
          {title}
        </label>
        <button
          type="button"
          onClick={() => onSetAuto(!auto)}
          disabled={!enabled}
          className={`rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
            auto
              ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {auto ? 'Auto ✓' : 'Auto'}
        </button>
      </div>
      <div className={`grid grid-cols-2 gap-3 ${enabled ? '' : 'pointer-events-none opacity-40'}`}>
        <NumberField label="X" value={region.x} min={0} max={maxW} onChange={(v) => set({ x: v })} />
        <NumberField label="Y" value={region.y} min={0} max={maxH} onChange={(v) => set({ y: v })} />
        <NumberField label="Width" value={region.w} min={0} max={maxW} onChange={(v) => set({ w: v })} />
        <NumberField label="Height" value={region.h} min={0} max={maxH} onChange={(v) => set({ h: v })} />
      </div>
    </div>
  );
}
