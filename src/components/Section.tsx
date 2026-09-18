import type { ReactNode } from 'react';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-800">
      <h2 className="mb-4 text-lg font-medium">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
