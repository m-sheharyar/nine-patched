import { useEffect, useState } from 'react';
import { normalizeHex } from '@/core';
import { Field } from './Field';
import { focusRing, inputCls } from './styles';

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
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              aria-label={`${label} picker`}
              value={swatch}
              onChange={(e) => {
                setText(e.target.value);
                onChange(e.target.value);
              }}
              className={`h-7 w-7 shrink-0 cursor-pointer rounded border border-zinc-300 dark:border-zinc-700 ${focusRing}`}
            />
            <input
              id={id}
              type="text"
              spellCheck={false}
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
              className={`${inputCls} w-full ${invalid ? 'border-amber-600 dark:border-amber-400' : ''}`}
              placeholder="#000000"
            />
          </div>
          {invalid && (
            <p className="mt-1 text-[11px] leading-4 text-zinc-700 dark:text-zinc-300">
              Enter a hex color like #4CAF50 or #fff
            </p>
          )}
        </>
      )}
    </Field>
  );
}
