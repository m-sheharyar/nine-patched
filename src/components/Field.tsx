import { useId } from 'react';
import type { ReactNode } from 'react';
import { labelCls } from './styles';

interface FieldProps {
  label: string;
  /** Receives the generated id, which the control it renders must use so the label points at it. */
  children: (id: string) => ReactNode;
}

export function Field({ label, children }: FieldProps) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`${labelCls} mb-1`}>
        {label}
      </label>
      {children(id)}
    </div>
  );
}
