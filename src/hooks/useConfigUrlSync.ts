import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NinePatchConfig } from '@/core';
import { buildShareHash, parseShareHash } from '@/lib/shareLink';
import type { SharedConfig } from '@/lib/shareLink';

const DEBOUNCE_MS = 300;

let loaded: SharedConfig | null = null;

/**
 * The hash as it stood on load, parsed once so every lazy state initialiser and the first notice
 * see the same result.
 */
export function initialShareState(): SharedConfig {
  loaded ??= parseShareHash(window.location.hash);
  return loaded;
}

function urlWithHash(hash: string): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${hash === '' ? '' : `#${hash}`}`;
}

interface UrlSyncOptions {
  config: NinePatchConfig;
  fileName: string;
  /** A config that arrived over the URL: a link pasted into this tab, or back and forward. */
  onExternalChange: (shared: SharedConfig) => void;
}

export interface ConfigUrlSync {
  /** The link for the state on screen, which runs ahead of the debounced URL. */
  shareUrl: string;
  /** Drops the hash at once rather than waiting out the debounce. */
  clearHash: () => void;
}

/**
 * Mirrors the config and file name into the URL hash and back. Writes are debounced and always
 * `replaceState`, so editing never grows the history stack and never fires `hashchange` at us.
 */
export function useConfigUrlSync({ config, fileName, onExternalChange }: UrlSyncOptions): ConfigUrlSync {
  const hash = useMemo(() => buildShareHash(config, fileName), [config, fileName]);
  const hashRef = useRef(hash);
  useEffect(() => {
    hashRef.current = hash;
  }, [hash]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const url = urlWithHash(hash);
      if (url !== window.location.href) window.history.replaceState(null, '', url);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [hash]);

  useEffect(() => {
    const onHashChange = () => {
      const incoming = window.location.hash.replace(/^#/, '');
      // Only a hash we did not write ourselves carries news; an identical one is already on screen.
      if (incoming === hashRef.current) return;
      onExternalChange(parseShareHash(incoming));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [onExternalChange]);

  const clearHash = useCallback(() => {
    window.history.replaceState(null, '', urlWithHash(''));
  }, []);

  return { shareUrl: urlWithHash(hash), clearHash };
}
