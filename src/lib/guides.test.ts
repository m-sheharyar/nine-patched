import { describe, expect, it } from 'vitest';
import { guideGeometry, GUIDE_STROKE, type GuideInput } from './guides';

const base: GuideInput = {
  contentWidth: 80,
  contentHeight: 80,
  stretch: { x: 12, y: 12, w: 56, h: 56 },
  content: { x: 12, y: 12, w: 56, h: 56 },
  stretchEnabled: true,
  contentEnabled: true,
  scale: 1,
};

describe('guideGeometry', () => {
  it('sizes itself to the exported image, frame included', () => {
    const g = guideGeometry(base);
    expect(g.width).toBe(82);
    expect(g.height).toBe(82);
  });

  it('offsets by the 1px frame so a band starts on its marker pixel', () => {
    // The renderer paints the top marker at x = 1 + stretch.x for stretch.w pixels.
    expect(guideGeometry(base).stretchColumn?.edge).toBe(13);
    expect(guideGeometry(base).stretchRow?.edge).toBe(13);
  });

  it('puts each stretch line fully outside the region it marks', () => {
    const g = guideGeometry(base);
    expect(g.stretchColumn).toEqual({ edge: 13, before: 12.5, after: 69.5 });
    expect(g.stretchRow).toEqual({ edge: 13, before: 12.5, after: 69.5 });
  });

  it('puts the content stroke fully inside the region it marks', () => {
    expect(guideGeometry(base).content).toEqual({ x: 13.5, y: 13.5, width: 55, height: 55 });
  });

  it('leaves the shared boundary between the two guides, never on top of it', () => {
    // Identical regions: the stretch stroke covers [12, 13], the content stroke [13, 14].
    const g = guideGeometry(base);
    const stretchOuterEdge = g.stretchColumn!.before + GUIDE_STROKE / 2;
    const contentInnerEdge = g.content!.x - GUIDE_STROKE / 2;
    expect(stretchOuterEdge).toBe(contentInnerEdge);
  });

  it('multiplies every coordinate by the zoom', () => {
    const g = guideGeometry({ ...base, scale: 4 });
    expect(g.width).toBe(328);
    expect(g.stretchColumn).toEqual({ edge: 52, before: 51.5, after: 276.5 });
    expect(g.content).toEqual({ x: 52.5, y: 52.5, width: 223, height: 223 });
  });

  it('keeps the guides apart at 1x, where a stroke is as wide as a source pixel', () => {
    const g = guideGeometry({ ...base, scale: 1 });
    expect(g.content!.x - g.stretchColumn!.before).toBe(GUIDE_STROKE);
  });

  it('boxes the content region rather than banding it', () => {
    const g = guideGeometry({ ...base, content: { x: 5, y: 9, w: 20, h: 30 } });
    expect(g.content).toEqual({ x: 6.5, y: 10.5, width: 19, height: 29 });
  });

  it('drops the guides a disabled region has no markers for', () => {
    expect(guideGeometry({ ...base, stretchEnabled: false }).stretchColumn).toBeNull();
    expect(guideGeometry({ ...base, stretchEnabled: false }).stretchRow).toBeNull();
    expect(guideGeometry({ ...base, contentEnabled: false }).content).toBeNull();
  });

  it('drops a band whose axis has no marker run', () => {
    const g = guideGeometry({ ...base, stretch: { x: 12, y: 12, w: 0, h: 56 } });
    expect(g.stretchColumn).toBeNull();
    expect(g.stretchRow).not.toBeNull();
  });

  it('keeps a content guide while either axis still has a run', () => {
    const g = guideGeometry({ ...base, content: { x: 4, y: 0, w: 10, h: 0 } });
    expect(g.content).toEqual({ x: 5.5, y: 1.5, width: 9, height: 0 });
  });

  it('never collapses the content stroke to a negative size', () => {
    const g = guideGeometry({ ...base, content: { x: 4, y: 4, w: 1, h: 1 }, scale: 1 });
    expect(g.content).toEqual({ x: 5.5, y: 5.5, width: 0, height: 0 });
  });

  it('drops the content guide when neither axis has a run', () => {
    expect(guideGeometry({ ...base, content: { x: 0, y: 0, w: 0, h: 0 } }).content).toBeNull();
  });

  it('clamps a region that overflows the artwork, exactly as the renderer does', () => {
    const g = guideGeometry({ ...base, stretch: { x: 70, y: -5, w: 40, h: 500 } });
    expect(g.stretchColumn).toEqual({ edge: 71, before: 70.5, after: 81.5 });
    expect(g.stretchRow).toEqual({ edge: 1, before: 0.5, after: 81.5 });
  });

  it('lands on whole pixels for odd, non-square artwork', () => {
    const g = guideGeometry({
      ...base,
      contentWidth: 37,
      contentHeight: 15,
      stretch: { x: 18, y: 7, w: 1, h: 1 },
      content: { x: 3, y: 2, w: 31, h: 11 },
      scale: 7,
    });
    expect(g.width).toBe(273);
    expect(g.height).toBe(119);
    expect(g.stretchColumn).toEqual({ edge: 133, before: 132.5, after: 140.5 });
    expect(g.stretchRow).toEqual({ edge: 56, before: 55.5, after: 63.5 });
    expect(g.content).toEqual({ x: 28.5, y: 21.5, width: 216, height: 76 });
  });
});
