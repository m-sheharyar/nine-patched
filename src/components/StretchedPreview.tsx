import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';
import { stretchedContentBox } from '@/core';
import type { Region, Size } from '@/core';
import { dragTarget, MAX_PREVIEW_SIZE, nudgeTarget } from '@/lib/previewTarget';
import { Field } from './Field';
import { NumberInput } from './NumberInput';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';
import { focusRing } from './styles';

/** Breathing room around the artwork, and the room the resize handle needs at its corner. */
const STAGE_PADDING = 40;

/** The violet of the content guide in `GuideOverlay`: this box is that region, stretched. */
const CONTENT_GUIDE = '#8b5cf6';

type PreviewScale = '1' | '2' | '4';

const SCALES: SegmentedOption<PreviewScale>[] = [
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '4', label: '4x' },
];

/** White body, dark edge (inverted in the dark theme), so it reads on any fill in either theme. */
const handleCls =
  'absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize touch-none rounded-sm border border-zinc-900 bg-white ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white ' +
  'dark:border-zinc-100 dark:bg-zinc-900 dark:focus-visible:ring-offset-zinc-900 ' +
  focusRing;

interface StretchedPreviewProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  contentWidth: number;
  contentHeight: number;
  content: Region;
  contentEnabled: boolean;
  /** Already clamped by the caller: at least the source size, at most the preview limit. */
  target: Size;
  onTargetChange: (target: Size) => void;
  showGuides: boolean;
}

/** The artwork 9-sliced to a target size, with a sample content box over it. Read only: it never touches the config. */
export function StretchedPreview({
  canvasRef, contentWidth, contentHeight, content, contentEnabled, target, onTargetChange, showGuides,
}: StretchedPreviewProps) {
  const [scaleOption, setScaleOption] = useState<PreviewScale>('1');
  const drag = useRef<{ pointerId: number; x: number; y: number; from: Size } | null>(null);

  const scale = Number(scaleOption);
  const source = { width: contentWidth, height: contentHeight };
  const width = target.width * scale;
  const height = target.height * scale;

  // With no content markers there is no padding to keep, so the box is the whole target.
  const box = contentEnabled
    ? stretchedContentBox(source, content, target)
    : { x: 0, y: 0, w: target.width, h: target.height };

  const startDrag = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, from: target };
  };

  const moveDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const from = drag.current;
    if (!from || from.pointerId !== e.pointerId) return;
    onTargetChange(dragTarget(from.from, e.clientX - from.x, e.clientY - from.y, scale, source));
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const nudge = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = nudgeTarget(target, e.key, e.shiftKey, source);
    if (!next) return;
    e.preventDefault();
    onTargetChange(next);
  };

  return (
    <section
      aria-label="Stretched preview"
      className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-zinc-200 lg:border-t-0 lg:border-l dark:border-zinc-800"
    >
      <div className="flex shrink-0 items-end gap-3 border-b border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
        <Field label="Preview width">
          {(id) => (
            <NumberInput
              id={id}
              value={target.width}
              min={contentWidth}
              max={MAX_PREVIEW_SIZE}
              onChange={(v) => onTargetChange({ width: v, height: target.height })}
              className="w-20"
            />
          )}
        </Field>
        <Field label="Preview height">
          {(id) => (
            <NumberInput
              id={id}
              value={target.height}
              min={contentHeight}
              max={MAX_PREVIEW_SIZE}
              onChange={(v) => onTargetChange({ width: target.width, height: v })}
              className="w-20"
            />
          )}
        </Field>
        <div className="w-28 shrink-0">
          <SegmentedControl label="Preview scale" value={scaleOption} options={SCALES} onChange={setScaleOption} />
        </div>
      </div>

      <div className="checkerboard min-h-0 min-w-0 flex-1 overflow-auto">
        {/* Same max-content sizing as the source stage: an oversized target stays fully scrollable. */}
        <div
          className="flex h-max min-h-full w-max min-w-full items-center justify-center"
          style={{ padding: STAGE_PADDING }}
        >
          <div className="relative shrink-0" style={{ width, height }}>
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              data-testid="stretched-canvas"
              className="block"
              style={{ width, height, imageRendering: 'pixelated' }}
            />
            <div
              aria-hidden="true"
              data-testid="sample-text"
              className="absolute flex items-center justify-center overflow-hidden select-none"
              style={{
                left: box.x * scale,
                top: box.y * scale,
                width: box.w * scale,
                height: box.h * scale,
                outline: showGuides ? `1px dashed ${CONTENT_GUIDE}` : undefined,
                outlineOffset: -1,
              }}
            >
              {/* A layout probe, not part of the asset: its own chip keeps it legible on any fill. */}
              <span className="rounded-sm bg-zinc-900 px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap text-white">
                Sample text
              </span>
            </div>
            <button
              type="button"
              aria-label="Resize stretched preview"
              title="Drag to resize, or use the arrow keys"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={nudge}
              className={handleCls}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
