import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { fitScale, nextZoom, SMALL_SCREEN_ZOOM } from '@/lib/zoom';

export interface Zoom {
  stageRef: React.RefObject<HTMLDivElement>;
  /** The scale the canvas is actually drawn at. */
  zoom: number;
  /** True while the zoom is still following the stage size rather than a user choice. */
  isFit: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToStage: () => void;
}

/**
 * Integer zoom for the stage. It opens in Fit mode on a desktop layout and at SMALL_SCREEN_ZOOM
 * below it. In Fit mode it tracks the stage size, so resizing the window keeps the artwork framed
 * without ever landing on a fractional scale.
 */
export function useZoom(imageWidth: number, imageHeight: number): Zoom {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  // Same breakpoint as the `lg` side by side layout. Only the opening level depends on it.
  const [chosen, setChosen] = useState<number | null>(() =>
    window.matchMedia('(min-width: 1024px)').matches ? null : SMALL_SCREEN_ZOOM,
  );

  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => setStage({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit = fitScale(stage.width, stage.height, imageWidth, imageHeight);
  const zoom = chosen ?? fit;

  // Re-centre after every zoom change, so zooming into an oversized artwork does not dump the
  // view in its top-left corner.
  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
  }, [zoom]);

  const zoomIn = useCallback(() => setChosen(nextZoom(zoom, 1)), [zoom]);
  const zoomOut = useCallback(() => setChosen(nextZoom(zoom, -1)), [zoom]);
  const fitToStage = useCallback(() => setChosen(null), []);

  return { stageRef, zoom, isFit: chosen === null, zoomIn, zoomOut, fitToStage };
}
