import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Notice } from '@/lib/notices';
import { buttonCls, iconButtonCls, inputCls } from './styles';

const AUTO_HIDE_MS = 3000;

const stripCls =
  'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-zinc-200 bg-white px-3 py-1.5 ' +
  'dark:border-zinc-800 dark:bg-zinc-900';

interface NoticeBarProps {
  notice: Notice | null;
  onDismiss: () => void;
}

/**
 * One strip under the top bar, holding at most one notice. The live region itself stays mounted so
 * a notice that replaces another is still announced.
 */
export function NoticeBar({ notice, onDismiss }: NoticeBarProps) {
  const linkRef = useRef<HTMLInputElement>(null);

  // A link the user has to copy by hand is only useful in hand: focused, with the URL selected.
  useEffect(() => {
    const input = linkRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [notice]);

  useEffect(() => {
    if (notice?.autoHide !== true) return;
    const timer = setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  return (
    <div role="status" aria-live="polite" className={notice === null ? undefined : stripCls}>
      {notice !== null && (
        <>
          <p className="min-w-0 flex-1 text-[11px] leading-4 text-zinc-700 dark:text-zinc-300">{notice.text}</p>
          {notice.link !== undefined && (
            <input
              ref={linkRef}
              type="text"
              readOnly
              value={notice.link}
              aria-label="Share link"
              spellCheck={false}
              onFocus={(e) => e.currentTarget.select()}
              className={`${inputCls} min-w-0 grow basis-full sm:basis-56`}
            />
          )}
          {notice.action !== undefined && (
            <button type="button" onClick={notice.action.onClick} className={buttonCls}>
              {notice.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notice"
            title="Dismiss notice"
            className={`${iconButtonCls} ml-auto`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
