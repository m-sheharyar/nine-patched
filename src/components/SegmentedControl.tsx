import { useId } from 'react';
import type { ReactNode } from 'react';
import { labelCls } from './styles';

export interface SegmentedOption<T extends string> {
  value: T;
  /** Doubles as the accessible name, and as the tooltip when an icon stands in for it. */
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  /** Names the group; the options are the radios inside it. */
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}

/**
 * Radio group drawn as a segmented control. The radio itself is stretched over its whole segment
 * rather than hidden, so the visible target and the focus/hit target are the same element.
 */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div className="min-w-0">
      <span className={`${labelCls} mb-1`}>{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-0.5 rounded border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label
            key={option.value}
            title={option.label}
            className={
              'relative flex h-6 items-center justify-center rounded-sm text-[12px] text-zinc-600 transition-colors ' +
              'hover:text-zinc-900 has-[:checked]:bg-white has-[:checked]:text-zinc-900 has-[:checked]:shadow-sm ' +
              'dark:text-zinc-400 dark:hover:text-zinc-100 dark:has-[:checked]:bg-zinc-700 dark:has-[:checked]:text-zinc-50 ' +
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 dark:has-[:focus-visible]:ring-zinc-100'
            }
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-sm outline-none"
            />
            <span className="pointer-events-none relative flex items-center justify-center">
              {option.icon}
              <span className={option.icon ? 'sr-only' : 'truncate px-1.5'}>{option.label}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
