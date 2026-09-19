import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { renderNinePatch, resolveNinePatch, stretchUniformity } from '@/core';
import type { NinePatchConfig, StretchUniformity } from '@/core';

/** Nothing measured yet, and an unmeasured run is not one to warn about. */
const UNIFORM: StretchUniformity = { horizontal: true, vertical: true };

/**
 * Size the canvas to the exported image and redraw it whenever the config changes, then read the
 * drawn content back once to check the stretch runs. The state is replaced only when a flag flips,
 * so an edit that leaves both flags alone costs no extra render.
 */
export function useNinePatchCanvas(
  canvasRef: RefObject<HTMLCanvasElement>,
  config: NinePatchConfig,
): StretchUniformity {
  const [uniformity, setUniformity] = useState(UNIFORM);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { imageWidth, imageHeight, contentWidth, contentHeight, stretch } = resolveNinePatch(config);
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    renderNinePatch(ctx, config);

    // The frame carries the markers, not artwork, so only the content area is compared.
    const next = stretchUniformity(ctx.getImageData(1, 1, contentWidth, contentHeight), stretch);
    setUniformity((prev) =>
      prev.horizontal === next.horizontal && prev.vertical === next.vertical ? prev : next,
    );
  }, [canvasRef, config]);

  return uniformity;
}
