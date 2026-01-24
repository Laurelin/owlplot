import type { HoverMode, HoverResolver, HoverMetadata } from '../types'
import { HoverModeKind } from '../../shared/enums'
import { createPointResolver } from './pointResolver'
import { createXAxisResolver } from './xAxisResolver'
import { createYAxisResolver } from './yAxisResolver'

/**
 * Factory function that creates the appropriate resolver based on hover mode.
 * Note: GLYPH mode does not use resolvers - it uses event delegation via attachGlyphHover.
 */
export function createHoverResolver(
  mode: HoverMode,
  _metadata: HoverMetadata
): HoverResolver {
  switch (mode.kind) {
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
