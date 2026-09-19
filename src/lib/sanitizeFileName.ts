/** Characters no mainstream filesystem accepts in a name, plus the C0/DEL control range. */
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const ILLEGAL = /[/\\:*?"<>|\x00-\x1f\x7f]+/g;

/**
 * Turn a user-typed name into one that is safe to hand to a download, collapsing each run of
 * illegal characters into a single underscore and dropping an extension the user typed already.
 */
export function sanitizeFileName(name: string, fallback: string): string {
  const cleaned = name
    .trim()
    .replace(ILLEGAL, '_')
    .replace(/(\.9)?\.png$/i, '')
    .trim();
  return cleaned === '' ? fallback : cleaned;
}
