import { useCallback, useMemo, useRef, useState } from 'react';
import { Inspector } from '@/components/Inspector';
import { fileNotice, linkNotice, NoticeBar } from '@/components/NoticeBar';
import type { Notice } from '@/components/NoticeBar';
import { TopBar } from '@/components/TopBar';
import { Workspace } from '@/components/Workspace';
import {
  clampRegion,
  DEFAULT_CONFIG,
  DEFAULT_FILE_NAME,
  ninePatchWarnings,
  resolveNinePatch,
  serializeConfigDocument,
} from '@/core';
import type { NinePatchConfig } from '@/core';
import { initialShareState, useConfigUrlSync } from '@/hooks/useConfigUrlSync';
import { useNinePatchCanvas } from '@/hooks/useNinePatchCanvas';
import { usePresets } from '@/hooks/usePresets';
import { useTheme } from '@/hooks/useTheme';
import { configFileName, MAX_IMPORT_BYTES, readConfigText } from '@/lib/configFile';
import { downloadBlob } from '@/lib/downloadBlob';
import { downloadCanvasAsPng } from '@/lib/downloadCanvasAsPng';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import type { SharedConfig } from '@/lib/shareLink';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<NinePatchConfig>(() => initialShareState().config);
  const [fileName, setFileName] = useState(() => initialShareState().name);
  const [notice, setNotice] = useState<Notice | null>(() => linkNotice(initialShareState().issues));
  const [showGuides, setShowGuides] = useState(true);
  const { dark, toggleDark } = useTheme();

  const resolved = useMemo(() => resolveNinePatch(config), [config]);
  const uniformity = useNinePatchCanvas(canvasRef, config);
  const warnings = useMemo(() => ninePatchWarnings(config, uniformity), [config, uniformity]);

  const applyShared = useCallback((shared: SharedConfig) => {
    setConfig(shared.config);
    setFileName(shared.name);
    setNotice(linkNotice(shared.issues));
  }, []);

  const { shareUrl, clearHash } = useConfigUrlSync({ config, fileName, onExternalChange: applyShared });
  const { activePreset, applyPreset } = usePresets({ config, fileName, setConfig, setFileName, setNotice });

  const dismissNotice = useCallback(() => setNotice(null), []);

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
    setNotice(null);
    clearHash();
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasAsPng(canvas, `${sanitizeFileName(fileName, DEFAULT_FILE_NAME)}.9.png`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice({ text: 'Link copied', autoHide: true });
    } catch {
      setNotice({ text: 'Copy this link', link: shareUrl });
    }
  };

  const exportConfig = () => {
    const text = serializeConfigDocument(sanitizeFileName(fileName, DEFAULT_FILE_NAME), config);
    downloadBlob(new Blob([text], { type: 'application/json' }), configFileName(fileName));
  };

  const importConfig = async (file: File) => {
    const unreadable = () => setNotice({ text: 'Could not read that file' });
    if (file.size > MAX_IMPORT_BYTES) {
      unreadable();
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      unreadable();
      return;
    }
    const result = readConfigText(text);
    if (!result.ok) {
      unreadable();
      return;
    }
    setConfig(result.config);
    setFileName(result.name);
    setNotice(fileNotice(result.issues));
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
        onCopyLink={copyLink}
        onExport={exportConfig}
        onImport={importConfig}
      />

      <NoticeBar notice={notice} onDismiss={dismissNotice} />

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
        <Inspector
          config={config}
          resolved={resolved}
          activePreset={activePreset}
          onChange={update}
          onDimensionChange={setDimension}
          onApplyPreset={applyPreset}
        />
      </main>
    </div>
  );
}
