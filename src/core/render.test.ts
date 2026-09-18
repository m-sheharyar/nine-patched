import { describe, expect, it } from 'vitest';
import { rgbaStr } from './color';
import { DEFAULT_CONFIG } from './defaults';
import { sortedStops } from './gradient';
import { clamp } from './math';
import { renderNinePatch } from './render';
import type { NinePatchConfig, NinePatchContext } from './types';

type FillStyleValue = NinePatchContext['fillStyle'];

interface SetEvent {
  kind: 'set';
  prop: 'fillStyle';
  value: FillStyleValue;
}

interface CallEvent {
  kind: 'call';
  name: string;
  args: unknown[];
  /** fillStyle in effect at the moment this call was made. */
  fillStyle: FillStyleValue;
}

type Event = SetEvent | CallEvent;

interface RecordedGradient {
  args: [number, number, number, number];
  stops: Array<{ offset: number; color: string }>;
}

/** A hand-written recording fake of the NinePatchContext interface. */
function createRecordingContext() {
  const events: Event[] = [];
  const gradients: RecordedGradient[] = [];
  let currentFillStyle: FillStyleValue = '#000000';

  const call = (name: string, args: unknown[]) => {
    events.push({ kind: 'call', name, args, fillStyle: currentFillStyle });
  };

  const ctx: NinePatchContext = {
    get fillStyle() {
      return currentFillStyle;
    },
    set fillStyle(value: FillStyleValue) {
      currentFillStyle = value;
      events.push({ kind: 'set', prop: 'fillStyle', value });
    },
    clearRect: (x: number, y: number, w: number, h: number) => call('clearRect', [x, y, w, h]),
    fillRect: (x: number, y: number, w: number, h: number) => call('fillRect', [x, y, w, h]),
    beginPath: () => call('beginPath', []),
    closePath: () => call('closePath', []),
    moveTo: (x: number, y: number) => call('moveTo', [x, y]),
    lineTo: (x: number, y: number) => call('lineTo', [x, y]),
    arcTo: (x1: number, y1: number, x2: number, y2: number, r: number) => call('arcTo', [x1, y1, x2, y2, r]),
    ellipse: (x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number) =>
      call('ellipse', [x, y, rx, ry, rot, start, end]),
    fill: () => call('fill', []),
    createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => {
      call('createLinearGradient', [x0, y0, x1, y1]);
      const stops: Array<{ offset: number; color: string }> = [];
      const gradient = { addColorStop: (offset: number, color: string) => stops.push({ offset, color }) };
      gradients.push({ args: [x0, y0, x1, y1], stops });
      return gradient as unknown as CanvasGradient;
    },
  };

  return { ctx, events, gradients };
}

const cfg = (overrides: Partial<NinePatchConfig>): NinePatchConfig => ({ ...DEFAULT_CONFIG, ...overrides });

const fillRectCalls = (events: Event[]) =>
  events.filter((e): e is CallEvent => e.kind === 'call' && e.name === 'fillRect');

describe('renderNinePatch', () => {
  it('clears the full image before drawing anything', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, DEFAULT_CONFIG);
    expect(events[0]).toEqual({ kind: 'call', name: 'clearRect', args: [0, 0, 82, 82], fillStyle: '#000000' });
  });

  it('draws exactly the expected marker fillRects for the default config, in black', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, DEFAULT_CONFIG);

    const markers = fillRectCalls(events).map((e) => e.args);
    expect(markers).toEqual([
      [13, 0, 56, 1], // top
      [0, 13, 1, 56], // left
      [13, 81, 56, 1], // bottom
      [81, 13, 1, 56], // right
    ]);
    for (const e of fillRectCalls(events)) {
      expect(e.fillStyle).toBe('#000000');
    }
  });

  it('draws no marker fillRects when stretch and content are both disabled', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ stretchEnabled: false, contentEnabled: false }));
    expect(fillRectCalls(events)).toEqual([]);
  });

  it('draws only the stretch markers when content is disabled', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ contentEnabled: false }));
    const markers = fillRectCalls(events).map((e) => e.args);
    expect(markers).toEqual([
      [13, 0, 56, 1],
      [0, 13, 1, 56],
    ]);
  });

  it('does not fillRect a background when bgTransparent is true (the default)', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ stretchEnabled: false, contentEnabled: false, bgTransparent: true }));
    expect(fillRectCalls(events)).toEqual([]);
  });

  it('fillRects the background in the background color when bgTransparent is false', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(
      ctx,
      cfg({ stretchEnabled: false, contentEnabled: false, bgTransparent: false, backgroundColor: '#123456' }),
    );
    const calls = fillRectCalls(events);
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual([1, 1, 80, 80]);
    expect(calls[0].fillStyle).toBe('#123456');
  });

  it('draws the border path and fills it before the inner fill, when borderWidth > 0', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ borderWidth: 4, borderColor: '#ff0000', fillColor: '#0000ff', fillOpacity: 100 }));

    const calls = events.filter((e): e is CallEvent => e.kind === 'call');
    const fillIndices = calls.map((e, i) => ({ e, i })).filter(({ e }) => e.name === 'fill').map(({ i }) => i);
    expect(fillIndices).toHaveLength(2);

    const firstBeginPathIndex = calls.findIndex((e) => e.name === 'beginPath');
    expect(firstBeginPathIndex).toBeGreaterThanOrEqual(0);
    expect(firstBeginPathIndex).toBeLessThan(fillIndices[0]);

    // First fill: the full (un-inset) shape, painted with the border color.
    expect(calls[fillIndices[0]].fillStyle).toBe('#ff0000');
    // Second fill: the inset shape, painted with the resolved fill color.
    expect(calls[fillIndices[1]].fillStyle).toBe(rgbaStr('#0000ff', 100));
  });

  it('draws a single fill when borderWidth is 0', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ borderWidth: 0 }));
    const fillCount = events.filter((e) => e.kind === 'call' && e.name === 'fill').length;
    expect(fillCount).toBe(1);
  });

  it('gradient fill calls createLinearGradient and adds stops in sorted order', () => {
    const { ctx, gradients } = createRecordingContext();
    const stops = [
      { color: '#2e7d32', position: 100, opacity: 100 },
      { color: '#4caf50', position: 0, opacity: 100 },
    ];
    renderNinePatch(ctx, cfg({ fillType: 'gradient', gradientStops: stops, gradientAngle: 180, borderWidth: 0 }));

    expect(gradients).toHaveLength(1);
    const [x0, y0, x1, y1] = gradients[0].args;
    expect(x0).toBeCloseTo(41, 5);
    expect(y0).toBeCloseTo(1, 5);
    expect(x1).toBeCloseTo(41, 5);
    expect(y1).toBeCloseTo(81, 5);

    const expectedStops = sortedStops(stops).map((s) => ({
      offset: clamp(s.position / 100, 0, 1),
      color: rgbaStr(s.color, s.opacity),
    }));
    expect(gradients[0].stops).toEqual(expectedStops);
  });

  it('clamps a manual stretch region that exceeds the content size', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(
      ctx,
      cfg({
        contentWidth: 50,
        contentHeight: 50,
        stretchAuto: false,
        stretch: { x: 40, y: 40, w: 100, h: 100 },
        contentEnabled: false,
      }),
    );
    const markers = fillRectCalls(events).map((e) => e.args);
    // Only 10px remain after x=40 out of a 50px-wide content box.
    expect(markers).toEqual([
      [41, 0, 10, 1],
      [0, 41, 1, 10],
    ]);
  });
});
