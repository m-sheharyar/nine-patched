import { resolveNinePatch } from './geometry';
import type { NinePatchConfig } from './types';
import type { StretchUniformity } from './uniformity';

/** Problems worth surfacing to the user that still produce an image. */
export function ninePatchWarnings(config: NinePatchConfig, uniformity?: StretchUniformity): string[] {
  const { maxRadius, stretch } = resolveNinePatch(config);
  const warnings: string[] = [];
  if (!config.stretchEnabled || stretch.w <= 0 || stretch.h <= 0) {
    warnings.push("No stretch markers in one or both axes — this won't scale as a 9-patch (strict tools reject it).");
  }
  if (config.shape === 'rounded' && config.cornerRadius > maxRadius) {
    warnings.push(`Corner radius is limited to ${maxRadius}px by the current size. Increase the size to use a larger radius.`);
  }
  // Advisory only: a non-uniform run still exports, it just scales unevenly.
  if (uniformity && config.stretchEnabled) {
    if (!uniformity.horizontal) {
      warnings.push(
        'The horizontal stretch region is not uniform: its pixels change from left to right, so the image may look uneven when stretched wider. Use a fill that does not change along that axis, or a 1px wide stretch region.',
      );
    }
    if (!uniformity.vertical) {
      warnings.push(
        'The vertical stretch region is not uniform: its pixels change from top to bottom, so the image may look uneven when stretched taller. Use a fill that does not change along that axis, or a 1px tall stretch region.',
      );
    }
  }
  return warnings;
}
