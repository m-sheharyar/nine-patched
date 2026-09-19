import type { NinePatchConfig } from './types';

export const DEFAULT_CONFIG: NinePatchConfig = {
  shape: 'rounded',
  contentWidth: 64,
  contentHeight: 32,
  cornerRadius: 8,
  fillType: 'solid',
  fillColor: '#4caf50',
  fillOpacity: 100,
  gradientStops: [
    { color: '#4caf50', position: 0, opacity: 100 },
    { color: '#2e7d32', position: 100, opacity: 100 },
  ],
  gradientAngle: 180,
  bgTransparent: true,
  backgroundColor: '#000000',
  borderWidth: 0,
  borderColor: '#000000',
  stretchEnabled: true,
  stretchAuto: true,
  stretch: { x: 0, y: 0, w: 0, h: 0 },
  contentEnabled: true,
  contentAuto: true,
  content: { x: 0, y: 0, w: 0, h: 0 },
};

export const DEFAULT_FILE_NAME = 'nine_patch';
