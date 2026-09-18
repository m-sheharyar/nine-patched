import { Download } from 'lucide-react';
import { useId, useMemo } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { DEFAULT_FILE_NAME } from '@/core';
import { inputCls } from './styles';

interface PreviewPanelProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  imageWidth: number;
  imageHeight: number;
  contentWidth: number;
  contentHeight: number;
  warnings: string[];
  dark: boolean;
  fileName: string;
  onFileNameChange: (value: string) => void;
  onDownload: () => void;
}

export function PreviewPanel({
  canvasRef, imageWidth, imageHeight, contentWidth, contentHeight, warnings, dark, fileName, onFileNameChange, onDownload,
}: PreviewPanelProps) {
  const fileNameId = useId();

  const displayScale = useMemo(() => {
    const target = 320;
    return Math.max(1, Math.floor(target / Math.max(imageWidth, imageHeight)));
  }, [imageWidth, imageHeight]);

  const checker = dark ? { tile: '#334155', base: '#1e293b' } : { tile: '#d4d4d8', base: '#ffffff' };
  const checkerboard: CSSProperties = {
    backgroundImage: `linear-gradient(45deg, ${checker.tile} 25%, transparent 25%), linear-gradient(-45deg, ${checker.tile} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checker.tile} 75%), linear-gradient(-45deg, transparent 75%, ${checker.tile} 75%)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: checker.base,
  };

  return (
    <div className="md:sticky md:top-10 md:self-start">
      <div className="rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="flex justify-center">
          <div className="inline-block rounded p-3" style={checkerboard}>
            <canvas
              ref={canvasRef}
              className="block border border-slate-300/60 dark:border-slate-500/40"
              style={{ width: imageWidth * displayScale, height: imageHeight * displayScale, imageRendering: 'pixelated' }}
            />
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
          Exported file: {imageWidth} × {imageHeight} px (content {contentWidth} × {contentHeight} + 1px 9-patch frame), shown at {displayScale}×
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
          <label htmlFor={fileNameId} className="mb-1 block text-sm text-slate-700 dark:text-slate-300">File name</label>
          <div className="flex items-center gap-2">
            <input id={fileNameId} type="text" value={fileName} onChange={(e) => onFileNameChange(e.target.value)} className={inputCls} placeholder={DEFAULT_FILE_NAME} />
            <span className="text-slate-500 dark:text-slate-400">.9.png</span>
          </div>
        </div>

        <button
          onClick={onDownload}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Download className="h-5 w-5" />
          Download 9-Patch PNG
        </button>
      </div>
    </div>
  );
}
