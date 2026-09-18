import type { RefObject } from 'react';
import { guideGeometry } from '@/lib/guides';
import { GuideOverlay } from './GuideOverlay';

/** Breathing room around the artwork, and room for the guide labels above and below it. */
const STAGE_PADDING = 40;

interface StageProps {
  stageRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  contentWidth: number;
  contentHeight: number;
  stretch: { x: number; y: number; w: number; h: number };
  content: { x: number; y: number; w: number; h: number };
  stretchEnabled: boolean;
  contentEnabled: boolean;
  zoom: number;
  showGuides: boolean;
}

/** The artwork on its transparency backdrop, scaled to whole pixels and scrolled when it overflows. */
export function Stage({
  stageRef, canvasRef, contentWidth, contentHeight, stretch, content, stretchEnabled, contentEnabled, zoom, showGuides,
}: StageProps) {
  const geometry = guideGeometry({
    contentWidth,
    contentHeight,
    stretch,
    content,
    stretchEnabled,
    contentEnabled,
    scale: zoom,
  });

  return (
    <div ref={stageRef} className="checkerboard min-h-0 min-w-0 flex-1 overflow-auto">
      {/* max-content sizing, so an artwork larger than the stage stays fully scrollable rather
          than overflowing past the left and top edges the way plain centring would. */}
      <div
        className="flex h-max min-h-full w-max min-w-full items-center justify-center"
        style={{ padding: STAGE_PADDING }}
      >
        <div className="relative shrink-0" style={{ width: geometry.width, height: geometry.height }}>
          <canvas
            ref={canvasRef}
            className="block"
            style={{ width: geometry.width, height: geometry.height, imageRendering: 'pixelated' }}
          />
          {showGuides && <GuideOverlay geometry={geometry} />}
        </div>
      </div>
    </div>
  );
}
