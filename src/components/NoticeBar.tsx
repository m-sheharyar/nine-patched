import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { buttonCls, iconButtonCls, inputCls } from './styles';

export interface Notice {
  text: string;
  /** The link to copy by hand, when the clipboard API is missing or refuses. */
  link?: string;
  /** A confirmation, which clears itself rather than waiting to be dismissed. */
  autoHide?: boolean;
  /** A second action alongside dismiss, e.g. "Undo" right after applying a preset. */
  action?: { label: string; onClick: () => void };
}

const AUTO_HIDE_MS = 3000;

const stripCls =
  'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-zinc-200 bg-white px-3 py-1.5 ' +
  'dark:border-zinc-800 dark:bg-zinc-900';

/** The fields a config lost, read off the issue prefixes: `shape: expected ...` shows as `shape`. */
const fieldList = (issues: string[]) => [...new Set(issues.map((issue) => issue.split(':')[0]))].join(', ');

/** What to say about a config that arrived over the URL, or null when it arrived intact. */
export function linkNotice(issues: string[]): Notice | null {
  if (issues.length === 0) return null;
  if (issues.some((issue) => issue.startsWith('config:'))) return { text: 'Could not read that link' };
  return { text: `Some settings in this link were invalid and were reset to their defaults: ${fieldList(issues)}` };
}

/** What to say about an imported file that parsed but lost fields on the way. */
export function fileNotice(issues: string[]): Notice | null {
  if (issues.length === 0) return null;
  return { text: `Some settings in this file were invalid and were reset to their defaults: ${fieldList(issues)}` };
}

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
