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

const channelHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');

/** Per-channel linear blend of two hex colors; t = 0 gives `from`, t = 1 gives `to`. */
export function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const k = clamp(t, 0, 1);
  const mix = (x: number, y: number) => channelHex(x + (y - x) * k);
  return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`;
}
