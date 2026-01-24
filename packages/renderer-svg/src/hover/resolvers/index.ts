import type { HoverMode, HoverResolver, HoverMetadata } from '../types'
import { HoverModeKind } from '../../shared/enums'
import { createGlyphResolver } from './glyphResolver'
import { createPointResolver } from './pointResolver'
import { createXAxisResolver } from './xAxisResolver'
import { createYAxisResolver } from './yAxisResolver'

/**
 * Factory function that creates the appropriate resolver based on hover mode.
 */
export function createHoverResolver(
  mode: HoverMode,
  metadata: HoverMetadata
): HoverResolver {
  switch (mode.kind) {
    case HoverModeKind.GLYPH:
      return createGlyphResolver()
    case HoverModeKind.POINT:
      return createPointResolver()
    case HoverModeKind.X_AXIS:
      return createXAxisResolver()
    case HoverModeKind.Y_AXIS:
      return createYAxisResolver()
    default:
      // Fallback to point resolver
      return createPointResolver()
  }
}
