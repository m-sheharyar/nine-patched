import { Check, TriangleAlert } from 'lucide-react';

interface StatusLineProps {
  imageWidth: number;
  imageHeight: number;
  contentWidth: number;
  contentHeight: number;
  warnings: string[];
}

export function StatusLine({ imageWidth, imageHeight, contentWidth, contentHeight, warnings }: StatusLineProps) {
  return (
    <div className="shrink-0 border-t border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
          Exported file: {imageWidth} × {imageHeight} px (content {contentWidth} × {contentHeight} + 1px 9-patch frame)
        </p>
        {warnings.length === 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Valid 9-patch
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <ul aria-label="Warnings" className="mt-1.5 space-y-1">
          {warnings.map((w) => (
            <li
              key={w}
              className="flex items-start gap-1.5 border-l-2 border-amber-600 py-0.5 pl-2 text-[11px] leading-4 text-zinc-800 dark:border-amber-400 dark:text-zinc-200"
            >
              <TriangleAlert
                className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
