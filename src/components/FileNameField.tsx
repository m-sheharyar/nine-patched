import { useId } from 'react';
import { DEFAULT_FILE_NAME } from '@/core';

interface FileNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** The name the export is saved under. Its label is visually hidden; the `.9.png` suffix says it. */
export function FileNameField({ value, onChange }: FileNameFieldProps) {
  const id = useId();
  return (
    <div
      className={
        'flex h-8 min-w-0 flex-1 items-center rounded border border-zinc-300 bg-white pr-2 ' +
        'focus-within:ring-2 focus-within:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 ' +
        'dark:focus-within:ring-zinc-100 sm:w-52 sm:flex-none'
      }
    >
      <label htmlFor={id} className="sr-only">
        File name
      </label>
      <input
        id={id}
        type="text"
        value={value}
        spellCheck={false}
        title="File name"
        placeholder={DEFAULT_FILE_NAME}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 rounded-l bg-transparent px-2 text-[12px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
      />
      <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">.9.png</span>
    </div>
  );
}
