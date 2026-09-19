import { useEffect } from 'react';
import type { RefObject } from 'react';
import { drawNineSlice, nineSliceRects, resolveNinePatch } from '@/core';
import type { NinePatchConfig, Size } from '@/core';

/**
 * Draw the source canvas onto the preview canvas, 9-sliced to the target size.
 *
 * It must be called from the same component as `useNinePatchCanvas` and right after it: React runs
 * child effects before parent ones, so the same effect inside the preview pane would draw from the
 * previous frame of the source. The deps are the config object and the two target numbers, so
 * nothing redraws while neither has changed.
 */
export function useStretchedPreview(
  sourceRef: RefObject<HTMLCanvasElement>,
  previewRef: RefObject<HTMLCanvasElement>,
  config: NinePatchConfig,
  target: Size,
): void {
  const { width, height } = target;

  useEffect(() => {
    const source = sourceRef.current;
    const preview = previewRef.current;
    if (!source || !preview) return;
    const ctx = preview.getContext('2d');
    if (!ctx) return;

    const { contentWidth, contentHeight, stretch } = resolveNinePatch(config);
    // Assigning either dimension also clears the surface.
    preview.width = width;
    preview.height = height;
    // Without markers there is nothing to hold fixed, so the whole artwork scales.
    const run = config.stretchEnabled ? stretch : null;
    drawNineSlice(ctx, source, nineSliceRects({ width: contentWidth, height: contentHeight }, run, { width, height }));
  }, [sourceRef, previewRef, config, width, height]);
}
