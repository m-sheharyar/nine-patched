/** Shared control styling. The chrome is monochrome zinc so the artwork and guides carry all colour. */

export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100';

/** Width is left to the caller: Tailwind's own utility order makes `w-full` beat a later `w-16`. */
export const inputCls =
  'h-7 rounded border border-zinc-300 bg-white px-2 text-[12px] tabular-nums text-zinc-900 ' +
  'placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-400 ' +
  focusRing;

export const labelCls = 'block text-[11px] leading-4 text-zinc-500 dark:text-zinc-400';

/** Quiet, icon-sized chrome button: toolbar actions, zoom steps, stop removal. */
export const iconButtonCls =
  'inline-flex h-7 w-7 items-center justify-center rounded border border-transparent text-zinc-500 ' +
  'transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 ' +
  'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ' +
  focusRing;

/** Bordered secondary button with a label. */
export const buttonCls =
  'inline-flex h-7 items-center gap-1.5 rounded border border-zinc-300 px-2 text-[12px] text-zinc-700 ' +
  'transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 ' +
  'dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 ' +
  focusRing;

/** The one high-contrast action on screen. */
export const primaryButtonCls =
  'inline-flex h-8 items-center justify-center gap-2 rounded bg-zinc-900 px-3 text-[12px] font-medium text-white ' +
  'transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 ' +
  focusRing;

export const checkboxCls =
  'h-3.5 w-3.5 shrink-0 cursor-pointer accent-zinc-900 dark:accent-zinc-100 ' + focusRing;
