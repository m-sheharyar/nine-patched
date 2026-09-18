import { useMemo, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { FillSection } from '@/components/FillSection';
import { GeometrySection } from '@/components/GeometrySection';
import { PreviewPanel } from '@/components/PreviewPanel';
import { RegionsSection } from '@/components/RegionsSection';
import { clampRegion, DEFAULT_CONFIG, DEFAULT_FILE_NAME, ninePatchWarnings, resolveNinePatch } from '@/core';
import type { NinePatchConfig } from '@/core';
import { useNinePatchCanvas } from '@/hooks/useNinePatchCanvas';
import { useTheme } from '@/hooks/useTheme';
import { downloadCanvasAsPng } from '@/lib/downloadCanvasAsPng';
import { sanitizeFileName } from '@/lib/sanitizeFileName';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<NinePatchConfig>(DEFAULT_CONFIG);
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const { dark, toggleDark } = useTheme();

  const resolved = useMemo(() => resolveNinePatch(config), [config]);
  const warnings = useMemo(() => ninePatchWarnings(config), [config]);

  useNinePatchCanvas(canvasRef, config);

  const update = (patch: Partial<NinePatchConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const setDimension = (key: 'contentWidth' | 'contentHeight', v: number) =>
    setConfig((c) => {
      const next = { ...c, [key]: v };
      next.stretch = clampRegion(c.stretch, next.contentWidth, next.contentHeight);
      next.content = clampRegion(c.content, next.contentWidth, next.contentHeight);
      return next;
    });

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasAsPng(canvas, `${sanitizeFileName(fileName, DEFAULT_FILE_NAME)}.9.png`);
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
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
          <PreviewPanel
            canvasRef={canvasRef}
            imageWidth={resolved.imageWidth}
            imageHeight={resolved.imageHeight}
            contentWidth={config.contentWidth}
            contentHeight={config.contentHeight}
            warnings={warnings}
            dark={dark}
            fileName={fileName}
            onFileNameChange={setFileName}
            onDownload={downloadImage}
          />

          <div className="space-y-6">
            <GeometrySection
              config={config}
              radius={resolved.radius}
              maxRadius={resolved.maxRadius}
              onChange={update}
              onDimensionChange={setDimension}
            />
            <FillSection config={config} maxRadius={resolved.maxRadius} onChange={update} />
            <RegionsSection config={config} stretch={resolved.stretch} content={resolved.content} onChange={update} />
          </div>
        </div>
      </div>
    </div>
  );
}
