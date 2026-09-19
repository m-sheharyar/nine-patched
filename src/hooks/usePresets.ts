import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Notice } from '@/components/NoticeBar';
import { findActivePreset, presetConfig } from '@/core';
import type { NinePatchConfig, Preset } from '@/core';
import { nameAfterPreset } from '@/lib/presetName';

interface Snapshot {
  config: NinePatchConfig;
  name: string;
}

interface UsePresetsOptions {
  config: NinePatchConfig;
  fileName: string;
  setConfig: (config: NinePatchConfig) => void;
  setFileName: (name: string) => void;
  setNotice: Dispatch<SetStateAction<Notice | null>>;
}

export interface PresetsController {
  /** The preset whose config is currently on screen, if any. */
  activePreset: Preset | null;
  applyPreset: (preset: Preset) => void;
}

/**
 * Applying a preset snapshots the config and name so `Undo` can restore them, one level deep.
 * That offer must not survive a later change from ANY source (an edit, an import, a hashchange),
 * so a single effect watches `config`/`fileName` and clears it. It is guarded by an identity
 * check against the exact values the apply itself just wrote, so that write doesn't clear its
 * own offer, and it drops the notice only if it is still the one the apply put up (a `setNotice`
 * functional update, so it never stomps a notice a later change already replaced).
 */
export function usePresets({
  config,
  fileName,
  setConfig,
  setFileName,
  setNotice,
}: UsePresetsOptions): PresetsController {
  const activePreset = useMemo(() => findActivePreset(config), [config]);

  const appliedRef = useRef<Snapshot | null>(null);
  const appliedNoticeRef = useRef<Notice | null>(null);
  const undoSnapshotRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (appliedRef.current?.config === config && appliedRef.current?.name === fileName) return;
    appliedRef.current = null;
    undoSnapshotRef.current = null;
    setNotice((current) => (current === appliedNoticeRef.current ? null : current));
  }, [config, fileName, setNotice]);

  const undo = useCallback(() => {
    const snapshot = undoSnapshotRef.current;
    if (snapshot === null) return;
    appliedRef.current = null;
    appliedNoticeRef.current = null;
    undoSnapshotRef.current = null;
    setConfig(snapshot.config);
    setFileName(snapshot.name);
    setNotice(null);
  }, [setConfig, setFileName, setNotice]);

  const applyPreset = useCallback(
    (preset: Preset) => {
      if (activePreset?.id === preset.id) return;

      const nextConfig = presetConfig(preset);
      const nextName = nameAfterPreset(fileName, preset);
      const notice: Notice = { text: `Applied preset: ${preset.label}`, action: { label: 'Undo', onClick: undo } };

      undoSnapshotRef.current = { config, name: fileName };
      appliedRef.current = { config: nextConfig, name: nextName };
      appliedNoticeRef.current = notice;

      setConfig(nextConfig);
      setFileName(nextName);
      setNotice(notice);
    },
    [activePreset, config, fileName, setConfig, setFileName, setNotice, undo],
  );

  return { activePreset, applyPreset };
}
