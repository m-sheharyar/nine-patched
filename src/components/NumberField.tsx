import { useEffect, useState } from 'react';
import { Field } from './Field';
import { inputCls } from './styles';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  float?: boolean;
}

export function NumberField({ label, value, onChange, min, max, disabled, float }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const parse = (s: string) => (float ? parseFloat(s) : parseInt(s, 10));

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const bounded = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const commit = (raw: string) => {
    const n = parse(raw);
    const v = bounded(Number.isFinite(n) ? n : (min ?? 0));
    setText(String(v));
    onChange(v);
  };

  return (
    <Field label={label}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode={float ? 'decimal' : 'numeric'}
          step={float ? 'any' : 1}
          value={text}
          min={min}
          max={max}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const raw = e.target.value;
            // The text stays exactly as typed until blur; only the committed value is clamped.
            setText(raw);
            if (raw === '' || raw === '-' || raw.endsWith('.')) return;
            const n = parse(raw);
            if (!Number.isFinite(n)) return;
            onChange(bounded(n));
          }}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500`}
        />
      )}
    </Field>
  );
}
