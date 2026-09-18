import { describe, expect, it } from 'vitest';
import { roundedRectPath, shapePath } from './shapes';

interface Call {
  name: string;
  args: number[];
}

function createRecorder() {
  const calls: Call[] = [];
  return {
    calls,
    beginPath: () => calls.push({ name: 'beginPath', args: [] }),
    closePath: () => calls.push({ name: 'closePath', args: [] }),
    moveTo: (x: number, y: number) => calls.push({ name: 'moveTo', args: [x, y] }),
    lineTo: (x: number, y: number) => calls.push({ name: 'lineTo', args: [x, y] }),
    arcTo: (x1: number, y1: number, x2: number, y2: number, r: number) =>
      calls.push({ name: 'arcTo', args: [x1, y1, x2, y2, r] }),
    ellipse: (x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number) =>
      calls.push({ name: 'ellipse', args: [x, y, rx, ry, rotation, start, end] }),
  };
}

describe('roundedRectPath', () => {
  it('clamps the radius to half the smaller dimension and draws the 4-corner outline', () => {
    const ctx = createRecorder();
    roundedRectPath(ctx, 0, 0, 10, 4, 10); // requested r=10, but max is min(10,4)/2=2

    expect(ctx.calls).toEqual([
      { name: 'beginPath', args: [] },
      { name: 'moveTo', args: [2, 0] },
      { name: 'lineTo', args: [8, 0] },
      { name: 'arcTo', args: [10, 0, 10, 2, 2] },
      { name: 'lineTo', args: [10, 2] },
      { name: 'arcTo', args: [10, 4, 8, 4, 2] },
      { name: 'lineTo', args: [2, 4] },
      { name: 'arcTo', args: [0, 4, 0, 2, 2] },
      { name: 'lineTo', args: [0, 2] },
      { name: 'arcTo', args: [0, 0, 2, 0, 2] },
      { name: 'closePath', args: [] },
    ]);
  });

  it('respects a non-zero origin', () => {
    const ctx = createRecorder();
    roundedRectPath(ctx, 5, 7, 20, 20, 3);
    expect(ctx.calls[1]).toEqual({ name: 'moveTo', args: [8, 7] }); // x + r, y
  });
});

describe('shapePath', () => {
  it.each([
    ['zero width', 0, 10],
    ['zero height', 10, 0],
    ['negative width', -5, 10],
  ])('draws nothing but beginPath for a degenerate box (%s)', (_name, w, h) => {
    const ctx = createRecorder();
    shapePath(ctx, 'rounded', 0, 0, w, h, 5);
    expect(ctx.calls).toEqual([{ name: 'beginPath', args: [] }]);
  });

  it('ellipse: draws an ellipse centred in the box, ignoring the radius argument', () => {
    const ctx = createRecorder();
    shapePath(ctx, 'ellipse', 0, 0, 20, 10, 999);
    expect(ctx.calls).toEqual([
      { name: 'beginPath', args: [] },
      { name: 'ellipse', args: [10, 5, 10, 5, 0, 0, Math.PI * 2] },
      { name: 'closePath', args: [] },
    ]);
  });

  it.each(['rounded', 'pill', 'rectangle'] as const)('%s: delegates to roundedRectPath verbatim', (shape) => {
    const direct = createRecorder();
    roundedRectPath(direct, 1, 2, 30, 20, 5);

    const viaShapePath = createRecorder();
    shapePath(viaShapePath, shape, 1, 2, 30, 20, 5);

    expect(viaShapePath.calls).toEqual(direct.calls);
  });
});
