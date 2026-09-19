import { useId } from 'react';
import type { RefObject } from 'react';
import type { ResolvedNinePatch, Size } from '@/core';
import { useZoom } from '@/hooks/useZoom';
import { Stage } from './Stage';
import { StatusLine } from './StatusLine';
import { StretchedPreview } from './StretchedPreview';
import { ZoomControls } from './ZoomControls';
import { checkboxCls } from './styles';

interface WorkspaceProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  previewRef: RefObject<HTMLCanvasElement>;
  resolved: ResolvedNinePatch;
  stretchEnabled: boolean;
  contentEnabled: boolean;
  showGuides: boolean;
  onShowGuidesChange: (value: boolean) => void;
  target: Size;
  onTargetChange: (target: Size) => void;
  warnings: string[];
}

export function Workspace({
  canvasRef, previewRef, resolved, stretchEnabled, contentEnabled, showGuides, onShowGuidesChange,
  target, onTargetChange, warnings,
}: WorkspaceProps) {
  const guidesId = useId();
  const { stageRef, zoom, isFit, zoomIn, zoomOut, fitToStage } = useZoom(resolved.imageWidth, resolved.imageHeight);

  return (
    // Two stages below lg need roughly twice the height one needed, or both end up cramped.
    <section aria-label="Workspace" className="flex h-[112vh] min-h-0 min-w-0 flex-col lg:h-auto lg:flex-1">
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

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
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
        <StretchedPreview
          canvasRef={previewRef}
          contentWidth={resolved.contentWidth}
          contentHeight={resolved.contentHeight}
          content={resolved.content}
          contentEnabled={contentEnabled}
          target={target}
          onTargetChange={onTargetChange}
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
