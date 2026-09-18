import { clamp } from './math';

/** Accepts #rgb / #rrggbb (with or without #); returns canonical #rrggbb, or null if invalid. */
export function normalizeHex(s: string): string | null {
  let v = s.trim().toLowerCase();
  if (v.startsWith('#')) v = v.slice(1);
  if (/^[0-9a-f]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(v)) return '#' + v;
  return null;
}

export function hexToRgb(hex: string) {
  const n = normalizeHex(hex) ?? '#000000';
  return { r: parseInt(n.slice(1, 3), 16), g: parseInt(n.slice(3, 5), 16), b: parseInt(n.slice(5, 7), 16) };
}

/** Build a canvas-/CSS-compatible rgba() string from a hex color and a 0-100 opacity. */
export function rgbaStr(hex: string, opacity: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 100) / 100})`;
}
