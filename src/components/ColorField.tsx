import { useEffect, useState } from 'react';
import { normalizeHex } from '@/core';
import { Field } from './Field';
import { inputCls } from './styles';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);

  const norm = normalizeHex(text);
  const swatch = norm ?? value;
  const invalid = focused && norm === null && text.trim() !== '';

  return (
    <Field label={label}>
      {(id) => (
        <>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${label} picker`}
              value={swatch}
              onChange={(e) => {
                setText(e.target.value);
                onChange(e.target.value);
              }}
              className="h-10 w-12 shrink-0 cursor-pointer rounded border border-slate-300 dark:border-slate-600"
            />
            <input
              id={id}
              type="text"
              value={text}
              onFocus={() => setFocused(true)}
              onChange={(e) => {
                const raw = e.target.value;
                setText(raw);
                const n = normalizeHex(raw);
                if (n) onChange(n);
              }}
              onBlur={() => {
                setFocused(false);
                const n = normalizeHex(text);
                if (n) {
                  setText(n);
                  onChange(n);
                } else {
                  setText(value);
                }
              }}
              className={`${inputCls} ${invalid ? 'border-red-500 dark:border-red-500' : ''}`}
              placeholder="#000000"
            />
          </div>
          {invalid && <p className="mt-1 text-xs text-red-500">Enter a hex color like #4CAF50 or #fff</p>}
        </>
      )}
    </Field>
  );
}
