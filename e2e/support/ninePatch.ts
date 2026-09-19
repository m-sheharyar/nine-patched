import { PNG } from 'pngjs';

/**
 * Independent 9-patch test oracle. Deliberately does not import anything from
 * `src/` so it validates the app's output rather than the app's own logic.
 */

export interface DecodedPng {
  width: number;
  height: number;
  data: Buffer;
}

export interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Run {
  start: number;
  end: number;
}

export interface NinePatchMarkers {
  top: Run[];
  left: Run[];
  bottom: Run[];
  right: Run[];
}

export function decodePng(buffer: Buffer): DecodedPng {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: png.data };
}

export function getPixel(png: DecodedPng, x: number, y: number): Pixel {
  const i = (png.width * y + x) << 2;
  return { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], a: png.data[i + 3] };
}

function isTransparent(p: Pixel): boolean {
  return p.a === 0;
}

function isOpaqueBlack(p: Pixel): boolean {
  return p.r === 0 && p.g === 0 && p.b === 0 && p.a === 255;
}

function describePixel(p: Pixel): string {
  return `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a})`;
}

/** Finds the inclusive [start, end] runs of opaque-black samples along a line of pixels. */
function findBlackRuns(length: number, pixelAt: (i: number) => Pixel): Run[] {
  const runs: Run[] = [];
  let start: number | null = null;
  for (let i = 0; i < length; i++) {
    if (isOpaqueBlack(pixelAt(i))) {
      if (start === null) start = i;
    } else if (start !== null) {
      runs.push({ start, end: i - 1 });
      start = null;
    }
  }
  if (start !== null) runs.push({ start, end: length - 1 });
  return runs;
}

/** Reads the black stretch/content marker runs on each of the four 1px frame edges. */
export function readMarkers(png: DecodedPng): NinePatchMarkers {
  const { width, height } = png;
  return {
    top: findBlackRuns(width, (x) => getPixel(png, x, 0)),
    bottom: findBlackRuns(width, (x) => getPixel(png, x, height - 1)),
    left: findBlackRuns(height, (y) => getPixel(png, 0, y)),
    right: findBlackRuns(height, (y) => getPixel(png, width - 1, y)),
  };
}

/**
 * Throws a descriptive error if `png` is not a structurally valid 9-patch:
 * transparent corners, and frame pixels that are either fully transparent or
 * opaque black (no anti-aliased greys).
 */
export function assertValidNinePatch(png: DecodedPng): void {
  const { width, height } = png;

  const corners: Array<{ x: number; y: number; name: string }> = [
    { x: 0, y: 0, name: 'top-left' },
    { x: width - 1, y: 0, name: 'top-right' },
    { x: 0, y: height - 1, name: 'bottom-left' },
    { x: width - 1, y: height - 1, name: 'bottom-right' },
  ];
  for (const { x, y, name } of corners) {
    const p = getPixel(png, x, y);
    if (!isTransparent(p)) {
      throw new Error(`Corner pixel (${x}, ${y}) [${name}] must be fully transparent, got ${describePixel(p)}`);
    }
  }

  const checkEdge = (name: string, length: number, coordAt: (i: number) => { x: number; y: number }) => {
    for (let i = 0; i < length; i++) {
      const { x, y } = coordAt(i);
      const p = getPixel(png, x, y);
      if (!isTransparent(p) && !isOpaqueBlack(p)) {
        throw new Error(
          `Frame pixel (${x}, ${y}) on the ${name} edge must be fully transparent or opaque black, got ${describePixel(p)}`,
        );
      }
    }
  };

  checkEdge('top', width, (x) => ({ x, y: 0 }));
  checkEdge('bottom', width, (x) => ({ x, y: height - 1 }));
  checkEdge('left', height, (y) => ({ x: 0, y }));
  checkEdge('right', height, (y) => ({ x: width - 1, y }));
}
