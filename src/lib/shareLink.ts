import { decodeConfig, DEFAULT_FILE_NAME, encodeConfig } from '@/core';
import type { NinePatchConfig } from '@/core';
import { MAX_NAME_LENGTH } from './configFile';

export interface SharedConfig {
  config: NinePatchConfig;
  name: string;
  issues: string[];
}

/**
 * The share hash, without the leading `#`: `c` carries the config, `n` the file name. Either part
 * is left out when it has nothing to say, so a default setup shares a URL with no hash at all.
 */
export function buildShareHash(config: NinePatchConfig, name: string): string {
  const parts: string[] = [];
  const encoded = encodeConfig(config);
  if (encoded !== '') parts.push(`c=${encoded}`);
  if (name.trim() !== '' && name !== DEFAULT_FILE_NAME) parts.push(`n=${encodeURIComponent(name)}`);
  return parts.join('&');
}

/** First value wins, so a repeated key cannot hide a second config behind the one we read. */
function readParams(query: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const part of query.split('&')) {
    if (part === '') continue;
    const eq = part.indexOf('=');
    const key = eq < 0 ? part : part.slice(0, eq);
    if (!params.has(key)) params.set(key, eq < 0 ? '' : part.slice(eq + 1));
  }
  return params;
}

/** The name is kept as typed; sanitising it belongs to the download and export paths. */
function readName(raw: string, issues: string[]): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    issues.push('name: expected valid percent-encoded text');
    return DEFAULT_FILE_NAME;
  }
  if (decoded.length > MAX_NAME_LENGTH) {
    issues.push(`name: expected at most ${MAX_NAME_LENGTH} characters`);
    return DEFAULT_FILE_NAME;
  }
  return decoded.trim() === '' ? DEFAULT_FILE_NAME : decoded;
}

/** Reads a share hash with or without its leading `#`. Never throws, whatever the URL carries. */
export function parseShareHash(hash: string): SharedConfig {
  const params = readParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const { config, issues } = decodeConfig(params.get('c') ?? '');
  const raw = params.get('n');
  const name = raw === undefined ? DEFAULT_FILE_NAME : readName(raw, issues);
  return { config, name, issues };
}
