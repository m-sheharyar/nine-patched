import { useEffect } from 'react';
import type { RefObject } from 'react';
import { resolveNinePatch, renderNinePatch, type NinePatchConfig } from '@/core';

/** Size the canvas to the exported image and redraw it whenever the config changes. */
export function useNinePatchCanvas(canvasRef: RefObject<HTMLCanvasElement>, config: NinePatchConfig): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { imageWidth, imageHeight } = resolveNinePatch(config);
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    renderNinePatch(ctx, config);
  }, [canvasRef, config]);
}
