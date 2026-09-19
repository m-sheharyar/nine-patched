export interface Notice {
  text: string;
  /** The link to copy by hand, when the clipboard API is missing or refuses. */
  link?: string;
  /** A confirmation, which clears itself rather than waiting to be dismissed. */
  autoHide?: boolean;
  /** A second action alongside dismiss, e.g. "Undo" right after applying a preset. */
  action?: { label: string; onClick: () => void };
}

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
