import { Download, FileDown, FileUp, Link2, Moon, RotateCcw, Sun } from 'lucide-react';
import { useRef } from 'react';
import { FileNameField } from './FileNameField';
import { buttonCls, iconButtonCls, primaryButtonCls } from './styles';

interface TopBarProps {
  dark: boolean;
  fileName: string;
  onFileNameChange: (value: string) => void;
  onToggleDark: () => void;
  onReset: () => void;
  onDownload: () => void;
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function TopBar({
  dark,
  fileName,
  onFileNameChange,
  onToggleDark,
  onReset,
  onDownload,
  onCopyLink,
  onExport,
  onImport,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared before the read, so picking the same file twice still fires a change.
    event.target.value = '';
    if (file) onImport(file);
  };

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-[13px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">nine-patched</h1>
      <p className="hidden text-[11px] text-zinc-500 2xl:block dark:text-zinc-400">
        Pixel-perfect 9-patch images for Roku &amp; Android, right in your browser.
      </p>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={onReset} title="Restore the default settings" className={buttonCls}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          aria-label="Copy share link"
          title="Copy share link"
          className={buttonCls}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden whitespace-nowrap sm:inline">Copy share link</span>
        </button>
        <button type="button" onClick={onExport} aria-label="Export config" title="Export config" className={buttonCls}>
          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden whitespace-nowrap sm:inline">Export config</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Import config"
          title="Import config"
          className={buttonCls}
        >
          <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden whitespace-nowrap sm:inline">Import config</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          aria-label="Import config file"
          tabIndex={-1}
          onChange={pickFile}
          className="sr-only"
        />
        <button
          type="button"
          onClick={onToggleDark}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
          className={iconButtonCls}
        >
          {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <FileNameField value={fileName} onChange={onFileNameChange} />
        <button
          type="button"
          onClick={onDownload}
          aria-label="Download 9-Patch PNG"
          title="Download 9-Patch PNG"
          className={primaryButtonCls}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="hidden whitespace-nowrap sm:inline">Download 9-Patch PNG</span>
        </button>
      </div>
    </header>
  );
}
