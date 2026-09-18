import { useId } from 'react';
import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  /** Receives the generated id, which the control it renders must use so the label points at it. */
  children: (id: string) => ReactNode;
}

export function Field({ label, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children(id)}
    </div>
  );
}
