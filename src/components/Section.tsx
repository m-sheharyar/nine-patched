import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-zinc-200 dark:border-zinc-800">
      <summary
        className={
          'flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 ' +
          'text-zinc-500 select-none hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ' +
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-900 ' +
          'dark:focus-visible:outline-zinc-100 [&::-webkit-details-marker]:hidden'
        }
      >
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold tracking-wide">{title}</h2>
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}
