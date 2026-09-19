import { useState } from 'react';
import { inputCls } from './styles';

export interface NumberInputProps {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  float?: boolean;
  className?: string;
}

/**
 * A number entry that never rewrites what is being typed: the text is left alone until blur, while
 * every value handed to `onChange` is already clamped to [min, max]. The draft text only exists
 * while the field has focus, otherwise the field shows the value it was given.
 */
export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  disabled,
  float,
  className = 'w-full',
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const parse = (s: string) => (float ? parseFloat(s) : parseInt(s, 10));

  const bounded = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const commit = (raw: string) => {
    const n = parse(raw);
    onChange(bounded(Number.isFinite(n) ? n : (min ?? 0)));
  };

  return (
    <input
      id={id}
      type="number"
      inputMode={float ? 'decimal' : 'numeric'}
      step={float ? 'any' : 1}
      value={draft ?? String(value)}
      min={min}
      max={max}
      disabled={disabled}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === '' || raw === '-' || raw.endsWith('.')) return;
        const n = parse(raw);
        if (!Number.isFinite(n)) return;
        onChange(bounded(n));
      }}
      onBlur={(e) => {
        setDraft(null);
        commit(e.target.value);
      }}
      className={`${inputCls} disabled:bg-zinc-100 disabled:text-zinc-400 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-600 ${className}`}
    />
  );
}
