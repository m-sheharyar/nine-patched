import { useRef } from 'react';
import { resolveNinePatch } from '@/core';
import type { NinePatchConfig } from '@/core';
import { useNinePatchCanvas } from '@/hooks/useNinePatchCanvas';

/** Bounding box every thumbnail scales into, so a wide preset (the pill) letterboxes instead of overflowing. */
const THUMB_BOX = 40;

interface PresetThumbnailProps {
  config: NinePatchConfig;
}

/**
 * A small live render of a preset, drawn by the same `renderNinePatch` as the main canvas. It
 * sits on a fixed mid-grey tile (not a themed one) so a pure white or near-black fill stays
 * visible whichever theme the app is in.
 */
export function PresetThumbnail({ config }: PresetThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useNinePatchCanvas(canvasRef, config);

  const { imageWidth, imageHeight } = resolveNinePatch(config);
  const scale = Math.min(THUMB_BOX / imageWidth, THUMB_BOX / imageHeight);

  return (
    <div aria-hidden="true" className="flex h-10 w-full items-center justify-center rounded bg-zinc-500">
      <canvas
        ref={canvasRef}
        style={{ width: imageWidth * scale, height: imageHeight * scale, imageRendering: 'pixelated' }}
      />
    </div>
  );
}
