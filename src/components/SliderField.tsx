import * as Slider from '@radix-ui/react-slider';
import { useId } from 'react';
import { NumberInput } from './NumberInput';
import { focusRing, labelCls } from './styles';

interface SliderFieldProps {
  label: string;
  /**
   * Accessible name for the slider thumb. It must not start with `label`, or a `getByLabel`
   * lookup for the number input would match the slider too.
   */
  sliderLabel: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  float?: boolean;
}

export function SliderField({ label, sliderLabel, value, min, max, onChange, disabled, float }: SliderFieldProps) {
  const id = useId();
  // A degenerate range (a 1px shape leaves no room for a radius) has nothing to drag.
  const sliderDisabled = disabled || max <= min;

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className={`${labelCls} min-w-0 flex-1 truncate`}>
          {label}
        </label>
        <NumberInput
          id={id}
          value={value}
          min={min}
          max={max}
          onChange={onChange}
          disabled={disabled}
          float={float}
          className="w-16 shrink-0 text-right"
        />
      </div>
      <Slider.Root
        className="relative flex h-4 w-full touch-none items-center select-none data-[disabled]:opacity-40"
        value={[Math.min(Math.max(value, min), max)]}
        min={min}
        max={Math.max(max, min + 1)}
        step={1}
        disabled={sliderDisabled}
        onValueChange={([next]) => onChange(next)}
      >
        <Slider.Track className="relative h-0.5 w-full grow rounded-full bg-zinc-200 dark:bg-zinc-700">
          <Slider.Range className="absolute h-full rounded-full bg-zinc-400 dark:bg-zinc-500" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={sliderLabel}
          className={`block h-3 w-3 rounded-full border border-zinc-400 bg-white shadow-sm data-[disabled]:cursor-default dark:border-zinc-500 dark:bg-zinc-300 ${focusRing}`}
        />
      </Slider.Root>
    </div>
  );
}
