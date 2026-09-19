import { Check } from 'lucide-react';
import type { Region } from '@/core';
import { NumberField } from './NumberField';
import { checkboxCls, focusRing } from './styles';

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
  title,
  enabled,
  auto,
  region,
  maxW,
  maxH,
  onToggleEnabled,
  onSetAuto,
  onChange,
}: RegionEditorProps) {
  const set = (patch: Partial<Region>) => onChange({ ...region, ...patch });
  return (
    <div className="rounded border border-zinc-200 p-2 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="flex min-w-0 cursor-pointer items-center gap-2 text-[12px] text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            className={checkboxCls}
          />
          {title}
        </label>
        <button
          type="button"
          onClick={() => onSetAuto(!auto)}
          disabled={!enabled}
          aria-pressed={auto}
          className={
            'inline-flex h-6 shrink-0 items-center gap-1 rounded border px-1.5 text-[11px] transition-colors ' +
            'disabled:pointer-events-none disabled:opacity-40 ' +
            (auto
              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
              : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800') +
            ' ' +
            focusRing
          }
        >
          {auto && <Check className="h-3 w-3" aria-hidden="true" />}
          Auto
        </button>
      </div>
      <div className={`grid grid-cols-2 gap-2 ${enabled ? '' : 'pointer-events-none opacity-40'}`}>
        <NumberField label="X" value={region.x} min={0} max={maxW} onChange={(v) => set({ x: v })} />
        <NumberField label="Y" value={region.y} min={0} max={maxH} onChange={(v) => set({ y: v })} />
        <NumberField label="Width" value={region.w} min={0} max={maxW} onChange={(v) => set({ w: v })} />
        <NumberField label="Height" value={region.h} min={0} max={maxH} onChange={(v) => set({ h: v })} />
      </div>
    </div>
  );
}
