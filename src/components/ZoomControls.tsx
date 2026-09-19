import { Minus, Plus } from 'lucide-react';
import { formatZoom, MAX_ZOOM, MIN_ZOOM } from '@/lib/zoom';
import { buttonCls, iconButtonCls } from './styles';

interface ZoomControlsProps {
  zoom: number;
  isFit: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function ZoomControls({ zoom, isFit, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Zoom out"
        title="Zoom out"
        className={iconButtonCls}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="status"
        aria-label="Zoom level"
        className="w-9 text-center text-[11px] text-zinc-600 tabular-nums dark:text-zinc-300"
      >
        {formatZoom(zoom)}
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        aria-label="Zoom in"
        title="Zoom in"
        className={iconButtonCls}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onFit}
        aria-pressed={isFit}
        title="Fit the artwork to the stage"
        className={`${buttonCls} ${isFit ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : ''}`}
      >
        Fit
      </button>
    </div>
  );
}
