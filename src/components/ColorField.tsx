import { useState } from 'react';
import { normalizeHex } from '@/core';
import { Field } from './Field';
import { focusRing, inputCls } from './styles';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  // The typed text only exists while the text field has focus, otherwise the field shows the value.
  const [draft, setDraft] = useState<string | null>(null);
  const focused = draft !== null;
  const text = draft ?? value;

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
              onChange={(e) => onChange(e.target.value)}
              className={`h-7 w-7 shrink-0 cursor-pointer rounded border border-zinc-300 dark:border-zinc-700 ${focusRing}`}
            />
            <input
              id={id}
              type="text"
              spellCheck={false}
              value={text}
              onFocus={() => setDraft(value)}
              onChange={(e) => {
                const raw = e.target.value;
                setDraft(raw);
                const n = normalizeHex(raw);
                if (n) onChange(n);
              }}
              onBlur={() => {
                setDraft(null);
                const n = normalizeHex(text);
                if (n) onChange(n);
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
