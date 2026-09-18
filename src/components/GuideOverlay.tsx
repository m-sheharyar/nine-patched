import { GUIDE_STROKE, type GuideGeometry } from '@/lib/guides';

/**
 * Android's Draw 9-patch conventions: pink for the stretchable area, violet for the content box.
 * The two hues sit close together, so the line style and the labels carry the difference too.
 * Nothing is filled: the artwork underneath has to stay colour accurate.
 */
const STRETCH = '#ec4899';
const CONTENT = '#8b5cf6';

const chipCls = 'absolute rounded-sm px-1 py-px text-[10px] leading-4 font-medium text-zinc-950';

/** Guides drawn over the scaled canvas. Never part of the canvas, so never part of the export. */
export function GuideOverlay({ geometry }: { geometry: GuideGeometry }) {
  const { width, height, stretchColumn, stretchRow, content } = geometry;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 overflow-visible">
        {stretchColumn && (
          <g stroke={STRETCH} strokeWidth={GUIDE_STROKE}>
            <line x1={stretchColumn.before} y1={0} x2={stretchColumn.before} y2={height} />
            <line x1={stretchColumn.after} y1={0} x2={stretchColumn.after} y2={height} />
          </g>
        )}
        {stretchRow && (
          <g stroke={STRETCH} strokeWidth={GUIDE_STROKE}>
            <line x1={0} y1={stretchRow.before} x2={width} y2={stretchRow.before} />
            <line x1={0} y1={stretchRow.after} x2={width} y2={stretchRow.after} />
          </g>
        )}
        {content && (
          <rect {...content} fill="none" stroke={CONTENT} strokeWidth={GUIDE_STROKE} strokeDasharray="5 4" />
        )}
      </svg>

      {(stretchColumn || stretchRow) && (
        <span className={chipCls} style={{ backgroundColor: STRETCH, left: stretchColumn?.edge ?? 0, top: -21 }}>
          stretch
        </span>
      )}
      {content && (
        <span className={chipCls} style={{ backgroundColor: CONTENT, left: content.x, top: height + 5 }}>
          content
        </span>
      )}
    </div>
  );
}
