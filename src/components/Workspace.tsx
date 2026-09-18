import { useId } from 'react';
import type { RefObject } from 'react';
import type { ResolvedNinePatch } from '@/core';
import { useZoom } from '@/hooks/useZoom';
import { Stage } from './Stage';
import { StatusLine } from './StatusLine';
import { ZoomControls } from './ZoomControls';
import { checkboxCls } from './styles';

interface WorkspaceProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  resolved: ResolvedNinePatch;
  stretchEnabled: boolean;
  contentEnabled: boolean;
  showGuides: boolean;
  onShowGuidesChange: (value: boolean) => void;
  warnings: string[];
}

export function Workspace({
  canvasRef, resolved, stretchEnabled, contentEnabled, showGuides, onShowGuidesChange, warnings,
}: WorkspaceProps) {
  const guidesId = useId();
  const { stageRef, zoom, isFit, zoomIn, zoomOut, fitToStage } = useZoom(resolved.imageWidth, resolved.imageHeight);

  return (
    <section aria-label="Workspace" className="flex h-[56vh] min-h-0 min-w-0 flex-col lg:h-auto lg:flex-1">
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900">
        <ZoomControls zoom={zoom} isFit={isFit} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitToStage} />
        <div className="flex items-center gap-2">
          <input
            id={guidesId}
            type="checkbox"
            checked={showGuides}
            onChange={(e) => onShowGuidesChange(e.target.checked)}
            className={checkboxCls}
          />
          <label htmlFor={guidesId} className="cursor-pointer text-[11px] text-zinc-600 dark:text-zinc-300">
            Show guides
          </label>
        </div>
      </div>

      {/* One row today; a stretched preview docks beside the source stage here later. */}
      <div className="flex min-h-0 flex-1">
        <Stage
          stageRef={stageRef}
          canvasRef={canvasRef}
          contentWidth={resolved.contentWidth}
          contentHeight={resolved.contentHeight}
          stretch={resolved.stretch}
          content={resolved.content}
          stretchEnabled={stretchEnabled}
          contentEnabled={contentEnabled}
          zoom={zoom}
          showGuides={showGuides}
        />
      </div>

      <StatusLine
        imageWidth={resolved.imageWidth}
        imageHeight={resolved.imageHeight}
        contentWidth={resolved.contentWidth}
        contentHeight={resolved.contentHeight}
        warnings={warnings}
      />
    </section>
  );
}
