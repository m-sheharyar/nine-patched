import { useMemo, useRef, useState } from 'react';
import { Inspector } from '@/components/Inspector';
import { TopBar } from '@/components/TopBar';
import { Workspace } from '@/components/Workspace';
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
  const [showGuides, setShowGuides] = useState(true);
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

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    setFileName(DEFAULT_FILE_NAME);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasAsPng(canvas, `${sanitizeFileName(fileName, DEFAULT_FILE_NAME)}.9.png`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 lg:h-screen lg:overflow-hidden dark:bg-zinc-950 dark:text-zinc-100">
      <TopBar
        dark={dark}
        fileName={fileName}
        onFileNameChange={setFileName}
        onToggleDark={toggleDark}
        onReset={reset}
        onDownload={downloadImage}
      />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Workspace
          canvasRef={canvasRef}
          resolved={resolved}
          stretchEnabled={config.stretchEnabled}
          contentEnabled={config.contentEnabled}
          showGuides={showGuides}
          onShowGuidesChange={setShowGuides}
          warnings={warnings}
        />
        <Inspector config={config} resolved={resolved} onChange={update} onDimensionChange={setDimension} />
      </main>
    </div>
  );
}
