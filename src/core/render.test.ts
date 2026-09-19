import { describe, expect, it } from 'vitest';
import { rgbaStr } from './color';
import { DEFAULT_CONFIG } from './defaults';
import { sortedStops } from './gradient';
import { clamp } from './math';
import { renderNinePatch } from './render';
import type { NinePatchConfig, NinePatchContext } from './types';

type FillStyleValue = NinePatchContext['fillStyle'];
type CompositeValue = NinePatchContext['globalCompositeOperation'];

type SetEvent =
  | { kind: 'set'; prop: 'fillStyle'; value: FillStyleValue }
  | { kind: 'set'; prop: 'globalCompositeOperation'; value: CompositeValue };

interface CallEvent {
  kind: 'call';
  name: string;
  args: unknown[];
  /** fillStyle in effect at the moment this call was made. */
  fillStyle: FillStyleValue;
  /** globalCompositeOperation in effect at the moment this call was made. */
  composite: CompositeValue;
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
  let currentComposite: CompositeValue = 'source-over';

  const call = (name: string, args: unknown[]) => {
    events.push({ kind: 'call', name, args, fillStyle: currentFillStyle, composite: currentComposite });
  };

  const ctx: NinePatchContext = {
    get fillStyle() {
      return currentFillStyle;
    },
    set fillStyle(value: FillStyleValue) {
      currentFillStyle = value;
      events.push({ kind: 'set', prop: 'fillStyle', value });
    },
    get globalCompositeOperation() {
      return currentComposite;
    },
    set globalCompositeOperation(value: CompositeValue) {
      currentComposite = value;
      events.push({ kind: 'set', prop: 'globalCompositeOperation', value });
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

const callEvents = (events: Event[]) => events.filter((e): e is CallEvent => e.kind === 'call');

const fillRectCalls = (events: Event[]) => callEvents(events).filter((e) => e.name === 'fillRect');

const fillCalls = (events: Event[]) => callEvents(events).filter((e) => e.name === 'fill');

describe('renderNinePatch', () => {
  it('clears the full image before drawing anything', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, DEFAULT_CONFIG);
    expect(events[0]).toEqual({
      kind: 'call',
      name: 'clearRect',
      // Default content 64x32 plus a 1px frame on each side.
      args: [0, 0, 66, 34],
      fillStyle: '#000000',
      composite: 'source-over',
    });
  });

  it('wipes the four frame strips after the artwork and before the markers', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ bgTransparent: false, backgroundColor: '#123456' }));

    const calls = callEvents(events);
    const wipes = calls.filter((e) => e.name === 'clearRect').slice(1);
    // Image is 66x34: top row, bottom row, left column, right column.
    expect(wipes.map((e) => e.args)).toEqual([
      [0, 0, 66, 1],
      [0, 33, 66, 1],
      [0, 0, 1, 34],
      [65, 0, 1, 34],
    ]);

    const firstWipe = calls.indexOf(wipes[0]);
    const lastWipe = calls.indexOf(wipes[3]);
    const background = calls.findIndex((e) => e.name === 'fillRect' && e.composite === 'destination-over');
    const firstMarker = calls.findIndex((e) => e.name === 'fillRect' && e.fillStyle === '#000000');
    expect(calls.map((e) => e.name).lastIndexOf('fill')).toBeLessThan(firstWipe);
    expect(background).toBeGreaterThan(-1);
    expect(background).toBeLessThan(firstWipe);
    expect(firstMarker).toBeGreaterThan(lastWipe);
  });

  it('draws exactly the expected marker fillRects for the default config, in black', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, DEFAULT_CONFIG);

    // Auto stretch/content region for the default (64x32, radius 8) is { x: 8, y: 8, w: 48, h: 16 },
    // offset by the 1px frame; image is 66x34 so the bottom/right edges sit at 33/65.
    const markers = fillRectCalls(events).map((e) => e.args);
    expect(markers).toEqual([
      [9, 0, 48, 1], // top
      [0, 9, 1, 16], // left
      [9, 33, 48, 1], // bottom
      [65, 9, 1, 16], // right
    ]);
    for (const e of fillRectCalls(events)) {
      expect(e.fillStyle).toBe('#000000');
      expect(e.composite).toBe('source-over');
    }
  });

  it('draws no marker fillRects when stretch and content are both disabled', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ stretchEnabled: false, contentEnabled: false }));
    expect(fillRectCalls(events)).toEqual([]);
  });

  it('draws only the stretch markers when content is disabled', () => {
    const { ctx, events } = createRecordingContext();
    // Explicit geometry (not the default): a square canvas keeps the marker run a round number.
    renderNinePatch(ctx, cfg({ contentWidth: 80, contentHeight: 80, cornerRadius: 12, contentEnabled: false }));
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

  it('fillRects the background behind everything else when bgTransparent is false', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(
      ctx,
      // Explicit content size (not the default): keeps the expected rect a round number.
      cfg({
        contentWidth: 80,
        contentHeight: 80,
        stretchEnabled: false,
        contentEnabled: false,
        bgTransparent: false,
        backgroundColor: '#123456',
      }),
    );
    const calls = fillRectCalls(events);
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual([1, 1, 80, 80]);
    expect(calls[0].fillStyle).toBe('#123456');
    // Drawn after the shape, with destination-over, so it ends up underneath it.
    expect(calls[0].composite).toBe('destination-over');
    const all = callEvents(events);
    expect(all.indexOf(calls[0])).toBeGreaterThan(all.findIndex((e) => e.name === 'fill'));
  });

  it('draws the border as a ring: outer shape, inner shape punched out, fill added back', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ borderWidth: 4, borderColor: '#ff0000', fillColor: '#0000ff', fillOpacity: 100 }));

    const calls = callEvents(events);
    const fills = fillCalls(events);
    expect(fills).toHaveLength(3);

    const firstBeginPathIndex = calls.findIndex((e) => e.name === 'beginPath');
    expect(firstBeginPathIndex).toBeGreaterThanOrEqual(0);
    expect(firstBeginPathIndex).toBeLessThan(calls.indexOf(fills[0]));

    // The full (un-inset) shape, painted with the border color.
    expect(fills[0].fillStyle).toBe('#ff0000');
    expect(fills[0].composite).toBe('source-over');
    // The inset shape, cleared so no border color is left under the fill.
    expect(fills[1].composite).toBe('destination-out');
    // The inset shape again, added so the two anti-aliased edges sum to full alpha.
    expect(fills[2].composite).toBe('lighter');
    expect(fills[2].fillStyle).toBe(rgbaStr('#0000ff', 100));
  });

  it('restores source-over before drawing the markers, border or not', () => {
    for (const borderWidth of [0, 4]) {
      const { ctx, events } = createRecordingContext();
      renderNinePatch(ctx, cfg({ borderWidth, bgTransparent: false, backgroundColor: '#123456' }));
      const markers = fillRectCalls(events).filter((e) => e.fillStyle === '#000000');
      expect(markers).toHaveLength(4);
      for (const marker of markers) expect(marker.composite).toBe('source-over');
    }
  });

  it('paints a fully transparent fill without ever putting the border color underneath it', () => {
    const { ctx, events } = createRecordingContext();
    renderNinePatch(ctx, cfg({ borderWidth: 4, borderColor: '#ff0000', fillColor: '#0000ff', fillOpacity: 0 }));
    const fills = fillCalls(events);
    expect(fills[1].composite).toBe('destination-out');
    expect(fills[2].fillStyle).toBe(rgbaStr('#0000ff', 0));
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
    // Explicit content size (not the default): keeps the expected gradient coordinates round numbers.
    renderNinePatch(
      ctx,
      cfg({
        contentWidth: 80,
        contentHeight: 80,
        fillType: 'gradient',
        gradientStops: stops,
        gradientAngle: 180,
        borderWidth: 0,
      }),
    );

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
