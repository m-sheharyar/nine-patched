import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Moon, Sun } from 'lucide-react';

type Shape = 'rounded' | 'pill' | 'ellipse' | 'rectangle';
type FillType = 'solid' | 'gradient';

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Config {
  shape: Shape;
  contentWidth: number;
  contentHeight: number;
  cornerRadius: number;
  fillType: FillType;
  fillColor: string;
  fillColor2: string;
  gradientAngle: number;
  bgTransparent: boolean;
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  stretchEnabled: boolean;
  stretchAuto: boolean;
  stretch: Region;
  contentEnabled: boolean;
  contentAuto: boolean;
  content: Region;
  fileName: string;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

function clampRegion(r: Region, w: number, h: number): Region {
  const x = clamp(r.x, 0, w);
  const y = clamp(r.y, 0, h);
  return { x, y, w: clamp(r.w, 0, w - x), h: clamp(r.h, 0, h - y) };
}

/** Accepts #rgb / #rrggbb (with or without #); returns canonical #rrggbb, or null if invalid. */
function normalizeHex(s: string): string | null {
  let v = s.trim().toLowerCase();
  if (v.startsWith('#')) v = v.slice(1);
  if (/^[0-9a-f]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(v)) return '#' + v;
  return null;
}

/** The radius actually used for the current shape (independent of the slider for pill/ellipse/rectangle). */
function effectiveRadius(shape: Shape, w: number, h: number, cornerRadius: number) {
  const maxR = Math.floor(Math.min(w, h) / 2);
  if (shape === 'rectangle') return 0;
  if (shape === 'pill' || shape === 'ellipse') return maxR;
  return clamp(cornerRadius, 0, maxR);
}

/** A sensible default region: the flat middle, inset by the corner radius so corners aren't stretched. */
function autoRegion(shape: Shape, w: number, h: number, cornerRadius: number): Region {
  const r = effectiveRadius(shape, w, h, cornerRadius);
  return { x: r, y: r, w: Math.max(0, w - 2 * r), h: Math.max(0, h - 2 * r) };
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, w: number, h: number, r: number) {
  if (w <= 0 || h <= 0) {
    ctx.beginPath();
    return;
  }
  if (shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
  } else {
    roundedRectPath(ctx, x, y, w, h, r);
  }
}

function makeGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, angleDeg: number, c1: string, c2: string) {
  const a = (angleDeg * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const half = Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2);
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

const DEFAULT_CONFIG: Config = {
  shape: 'rounded',
  contentWidth: 80,
  contentHeight: 80,
  cornerRadius: 12,
  fillType: 'solid',
  fillColor: '#4caf50',
  fillColor2: '#2e7d32',
  gradientAngle: 90,
  bgTransparent: true,
  backgroundColor: '#000000',
  borderWidth: 0,
  borderColor: '#000000',
  stretchEnabled: true,
  stretchAuto: true,
  stretch: { x: 0, y: 0, w: 0, h: 0 },
  contentEnabled: true,
  contentAuto: true,
  content: { x: 0, y: 0, w: 0, h: 0 },
  fileName: 'nine_patch',
};

const inputCls =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 ' +
  'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const imageWidth = cfg.contentWidth + 2;
  const imageHeight = cfg.contentHeight + 2;
  const radius = effectiveRadius(cfg.shape, cfg.contentWidth, cfg.contentHeight, cfg.cornerRadius);
  const maxRadius = Math.floor(Math.min(cfg.contentWidth, cfg.contentHeight) / 2);

  // Effective regions: when "auto" is on they are derived live from the current
  // geometry (so they follow radius/size/shape changes). Otherwise the stored values are used.
  const auto = autoRegion(cfg.shape, cfg.contentWidth, cfg.contentHeight, cfg.cornerRadius);
  const stretchRegion = cfg.stretchAuto ? auto : cfg.stretch;
  const contentRegion = cfg.contentAuto ? auto : cfg.content;

  const update = (patch: Partial<Config>) => setCfg((c) => ({ ...c, ...patch }));

  // Resizing must re-clamp any manually-entered regions so the inputs and output stay in sync.
  const setDimension = (key: 'contentWidth' | 'contentHeight', v: number) =>
    setCfg((c) => {
      const next = { ...c, [key]: v };
      next.stretch = clampRegion(c.stretch, next.contentWidth, next.contentHeight);
      next.content = clampRegion(c.content, next.contentWidth, next.contentHeight);
      return next;
    });

  // Non-blocking warnings about export validity.
  const warnings: string[] = [];
  if (!cfg.stretchEnabled || stretchRegion.w <= 0 || stretchRegion.h <= 0) {
    warnings.push("No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).");
  }
  if (cfg.shape === 'rounded' && cfg.cornerRadius > maxRadius) {
    warnings.push(`Corner radius is limited to ${maxRadius}px by the current size. Increase the size to use a larger radius.`);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageWidth;
    canvas.height = imageHeight;
    ctx.clearRect(0, 0, imageWidth, imageHeight);

    const cw = cfg.contentWidth;
    const ch = cfg.contentHeight;
    const ox = 1; // inner origin (the 9-patch frame is the outer 1px)
    const oy = 1;

    // Background fills only the inner content area, never the 1px metadata frame.
    if (!cfg.bgTransparent) {
      ctx.fillStyle = cfg.backgroundColor;
      ctx.fillRect(ox, oy, cw, ch);
    }

    const paint = (x: number, y: number, w: number, h: number): string | CanvasGradient =>
      cfg.fillType === 'gradient'
        ? makeGradient(ctx, x, y, w, h, cfg.gradientAngle, cfg.fillColor, cfg.fillColor2)
        : cfg.fillColor;

    // Shape (with optional inside border)
    const bw = clamp(cfg.borderWidth, 0, Math.floor(Math.min(cw, ch) / 2));
    if (bw > 0) {
      ctx.fillStyle = cfg.borderColor;
      shapePath(ctx, cfg.shape, ox, oy, cw, ch, radius);
      ctx.fill();
      ctx.fillStyle = paint(ox + bw, oy + bw, cw - 2 * bw, ch - 2 * bw);
      shapePath(ctx, cfg.shape, ox + bw, oy + bw, cw - 2 * bw, ch - 2 * bw, Math.max(0, radius - bw));
      ctx.fill();
    } else {
      ctx.fillStyle = paint(ox, oy, cw, ch);
      shapePath(ctx, cfg.shape, ox, oy, cw, ch, radius);
      ctx.fill();
    }

    // 9-patch markers (pure black, inside the 1px frame, corners left clear)
    ctx.fillStyle = '#000000';
    if (cfg.stretchEnabled) {
      const sx = clamp(stretchRegion.x, 0, cw);
      const sw = clamp(stretchRegion.w, 0, cw - sx);
      const sy = clamp(stretchRegion.y, 0, ch);
      const sh = clamp(stretchRegion.h, 0, ch - sy);
      if (sw > 0) ctx.fillRect(ox + sx, 0, sw, 1); // top -> horizontal stretch
      if (sh > 0) ctx.fillRect(0, oy + sy, 1, sh); // left -> vertical stretch
    }
    if (cfg.contentEnabled) {
      const cx = clamp(contentRegion.x, 0, cw);
      const cwid = clamp(contentRegion.w, 0, cw - cx);
      const cy = clamp(contentRegion.y, 0, ch);
      const cht = clamp(contentRegion.h, 0, ch - cy);
      if (cwid > 0) ctx.fillRect(ox + cx, imageHeight - 1, cwid, 1); // bottom -> horizontal content
      if (cht > 0) ctx.fillRect(imageWidth - 1, oy + cy, 1, cht); // right -> vertical content
    }
  }, [cfg, imageWidth, imageHeight, radius, stretchRegion, contentRegion]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cfg.fileName || 'nine_patch'}.9.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // Integer display scale so the small source image is visible and crisp.
  const displayScale = useMemo(() => {
    const target = 320;
    return Math.max(1, Math.floor(target / Math.max(imageWidth, imageHeight)));
  }, [imageWidth, imageHeight]);

  const checker = dark ? { tile: '#334155', base: '#1e293b' } : { tile: '#d4d4d8', base: '#ffffff' };
  const checkerboard: React.CSSProperties = {
    backgroundImage: `linear-gradient(45deg, ${checker.tile} 25%, transparent 25%), linear-gradient(-45deg, ${checker.tile} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checker.tile} 75%), linear-gradient(-45deg, transparent 75%, ${checker.tile} 75%)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: checker.base,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">nine-patched</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pixel-perfect 9-patch images for Roku &amp; Android, right in your browser.</p>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
          {/* Preview */}
          <div className="md:sticky md:top-10 md:self-start">
            <div className="rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
              <div className="flex justify-center">
                <div className="inline-block rounded p-3" style={checkerboard}>
                  <canvas
                    ref={canvasRef}
                    className="block border border-slate-300/60 dark:border-slate-500/40"
                    style={{
                      width: imageWidth * displayScale,
                      height: imageHeight * displayScale,
                      imageRendering: 'pixelated',
                    }}
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                Exported file: {imageWidth} × {imageHeight} px (content {cfg.contentWidth} × {cfg.contentHeight} + 1px 9-patch frame), shown at {displayScale}×
              </p>

              {warnings.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {warnings.map((w, i) => (
                    <li key={i} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                      {w}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4">
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">File name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cfg.fileName}
                    onChange={(e) => update({ fileName: e.target.value })}
                    className={inputCls}
                    placeholder="nine_patch"
                  />
                  <span className="text-slate-500 dark:text-slate-400">.9.png</span>
                </div>
              </div>

              <button
                onClick={downloadImage}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Download className="h-5 w-5" />
                Download 9-Patch PNG
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Section title="Geometry">
              <Field label="Shape">
                <select value={cfg.shape} onChange={(e) => update({ shape: e.target.value as Shape })} className={inputCls}>
                  <option value="rounded">Rounded rectangle</option>
                  <option value="pill">Pill (fully rounded)</option>
                  <option value="ellipse">Ellipse / circle</option>
                  <option value="rectangle">Rectangle</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Width (px)" value={cfg.contentWidth} min={1} max={2000} onChange={(v) => setDimension('contentWidth', v)} />
                <NumberField label="Height (px)" value={cfg.contentHeight} min={1} max={2000} onChange={(v) => setDimension('contentHeight', v)} />
              </div>
              <NumberField
                label={`Corner radius (px)${cfg.shape !== 'rounded' ? ' — auto for this shape' : ''}`}
                value={cfg.shape === 'rounded' ? clamp(cfg.cornerRadius, 0, maxRadius) : radius}
                min={0}
                max={maxRadius}
                disabled={cfg.shape !== 'rounded'}
                onChange={(v) => update({ cornerRadius: clamp(v, 0, maxRadius) })}
              />
            </Section>

            <Section title="Fill, background & border">
              <Field label="Fill type">
                <select value={cfg.fillType} onChange={(e) => update({ fillType: e.target.value as FillType })} className={inputCls}>
                  <option value="solid">Solid color</option>
                  <option value="gradient">Linear gradient</option>
                </select>
              </Field>
              <ColorField label={cfg.fillType === 'gradient' ? 'Gradient start' : 'Fill color'} value={cfg.fillColor} onChange={(v) => update({ fillColor: v })} />
              {cfg.fillType === 'gradient' && (
                <div className="grid grid-cols-2 items-end gap-3">
                  <ColorField label="Gradient end" value={cfg.fillColor2} onChange={(v) => update({ fillColor2: v })} />
                  <NumberField label="Angle (°)" value={cfg.gradientAngle} min={0} max={360} onChange={(v) => update({ gradientAngle: v })} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input id="bg-transparent" type="checkbox" checked={cfg.bgTransparent} onChange={(e) => update({ bgTransparent: e.target.checked })} className="h-4 w-4 cursor-pointer" />
                <label htmlFor="bg-transparent" className="text-sm text-slate-700 dark:text-slate-300">Transparent background</label>
              </div>
              {!cfg.bgTransparent && <ColorField label="Background color" value={cfg.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />}

              <div className="grid grid-cols-2 items-end gap-3">
                <NumberField label="Border width (px)" value={cfg.borderWidth} min={0} max={maxRadius} onChange={(v) => update({ borderWidth: v })} />
                <ColorField label="Border color" value={cfg.borderColor} onChange={(v) => update({ borderColor: v })} />
              </div>
            </Section>

            <Section title="9-Patch regions">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Coordinates are relative to the content area ({cfg.contentWidth} × {cfg.contentHeight}). The stretch box drives the top &amp; left markers; the content/padding box drives the bottom &amp; right markers. With <strong>Auto</strong> on, a box follows the corner radius and size automatically.
              </p>

              <RegionEditor
                title="Stretch region (top & left)"
                enabled={cfg.stretchEnabled}
                auto={cfg.stretchAuto}
                region={stretchRegion}
                maxW={cfg.contentWidth}
                maxH={cfg.contentHeight}
                onToggleEnabled={(v) => update({ stretchEnabled: v })}
                onSetAuto={(on) => update(on ? { stretchAuto: true } : { stretchAuto: false, stretch: stretchRegion })}
                onChange={(r) => update({ stretch: r, stretchAuto: false })}
              />
              <RegionEditor
                title="Content / padding region (bottom & right)"
                enabled={cfg.contentEnabled}
                auto={cfg.contentAuto}
                region={contentRegion}
                maxW={cfg.contentWidth}
                maxH={cfg.contentHeight}
                onToggleEnabled={(v) => update({ contentEnabled: v })}
                onSetAuto={(on) => update(on ? { contentAuto: true } : { contentAuto: false, content: contentRegion })}
                onChange={(r) => update({ content: r, contentAuto: false })}
              />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-800">
      <h2 className="mb-4 text-lg font-medium">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function NumberField({
  label, value, onChange, min, max, disabled,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean;
}) {
  // Local text state lets the field be empty/in-progress while typing; the parent
  // is only updated with a real number, and clamping happens on blur (not per keystroke).
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    let n = parseInt(raw, 10);
    if (!Number.isFinite(n)) n = min ?? 0;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setText(String(n));
    onChange(n);
  };

  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="numeric"
        value={text}
        min={min}
        max={max}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw === '' || raw === '-') return; // allow transient empty input
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          onChange(max !== undefined ? Math.min(max, n) : n);
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500`}
      />
    </Field>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);

  const norm = normalizeHex(text);
  const swatch = norm ?? value;
  const invalid = focused && norm === null && text.trim() !== '';

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatch}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value);
          }}
          className="h-10 w-12 shrink-0 cursor-pointer rounded border border-slate-300 dark:border-slate-600"
        />
        <input
          type="text"
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const n = normalizeHex(raw);
            if (n) onChange(n);
          }}
          onBlur={() => {
            setFocused(false);
            const n = normalizeHex(text);
            if (n) {
              setText(n);
              onChange(n);
            } else {
              setText(value); // revert invalid input
            }
          }}
          className={`${inputCls} ${invalid ? 'border-red-500 dark:border-red-500' : ''}`}
          placeholder="#000000"
        />
      </div>
      {invalid && <p className="mt-1 text-xs text-red-500">Enter a hex color like #4CAF50 or #fff</p>}
    </Field>
  );
}

function RegionEditor({
  title, enabled, auto, region, maxW, maxH, onToggleEnabled, onSetAuto, onChange,
}: {
  title: string;
  enabled: boolean;
  auto: boolean;
  region: Region;
  maxW: number;
  maxH: number;
  onToggleEnabled: (v: boolean) => void;
  onSetAuto: (on: boolean) => void;
  onChange: (r: Region) => void;
}) {
  const set = (patch: Partial<Region>) => onChange({ ...region, ...patch });
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggleEnabled(e.target.checked)} className="h-4 w-4 cursor-pointer" />
          {title}
        </label>
        <button
          type="button"
          onClick={() => onSetAuto(!auto)}
          disabled={!enabled}
          className={`rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
            auto
              ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {auto ? 'Auto ✓' : 'Auto'}
        </button>
      </div>
      <div className={`grid grid-cols-2 gap-3 ${enabled ? '' : 'pointer-events-none opacity-40'}`}>
        <NumberField label="X" value={region.x} min={0} max={maxW} onChange={(v) => set({ x: v })} />
        <NumberField label="Y" value={region.y} min={0} max={maxH} onChange={(v) => set({ y: v })} />
        <NumberField label="Width" value={region.w} min={0} max={maxW} onChange={(v) => set({ w: v })} />
        <NumberField label="Height" value={region.h} min={0} max={maxH} onChange={(v) => set({ h: v })} />
      </div>
    </div>
  );
}
