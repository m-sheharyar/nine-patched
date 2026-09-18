import { resolveNinePatch } from './geometry';
import type { NinePatchConfig } from './types';

/** Problems worth surfacing to the user that still produce an image. */
export function ninePatchWarnings(config: NinePatchConfig): string[] {
  const { maxRadius, stretch } = resolveNinePatch(config);
  const warnings: string[] = [];
  if (!config.stretchEnabled || stretch.w <= 0 || stretch.h <= 0) {
    warnings.push("No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).");
  }
  if (config.shape === 'rounded' && config.cornerRadius > maxRadius) {
    warnings.push(`Corner radius is limited to ${maxRadius}px by the current size. Increase the size to use a larger radius.`);
  }
  return warnings;
}
