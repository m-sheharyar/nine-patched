import type { Shape } from '@/core';

/** Each icon is the shape itself at 16px, so the segmented control needs no wording. */
export function ShapeIcon({ shape }: { shape: Shape }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {shape === 'ellipse' ? (
        <ellipse cx="8" cy="8" rx="6.25" ry="6.25" />
      ) : (
        <rect
          x="1.75"
          y={shape === 'pill' ? 3.75 : 1.75}
          width="12.5"
          height={shape === 'pill' ? 8.5 : 12.5}
          rx={shape === 'rounded' ? 4 : shape === 'pill' ? 4.25 : 0}
        />
      )}
    </svg>
  );
}
