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

  const commit = (raw: string) => {
    let n = parse(raw);
    if (!Number.isFinite(n)) n = min ?? 0;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setText(String(n));
    onChange(n);
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
            setText(raw);
            if (raw === '' || raw === '-' || raw.endsWith('.')) return;
            const n = parse(raw);
            if (!Number.isFinite(n)) return;
            onChange(max !== undefined ? Math.min(max, n) : n);
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
