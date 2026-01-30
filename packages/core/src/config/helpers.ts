import type { Padding, PointConfig, PointShape } from './types'

const DEFAULT_PADDING: Padding = {
  top: 16,
  right: 16,
  bottom: 24,
  left: 32,
}

/**
 * normalize a Partial<Padding> into full Padding
 */
export function mergePadding(partial: Partial<Padding> | undefined): Padding {
  return {
    top: partial?.top ?? DEFAULT_PADDING.top,
    right: partial?.right ?? DEFAULT_PADDING.right,
    bottom: partial?.bottom ?? DEFAULT_PADDING.bottom,
    left: partial?.left ?? DEFAULT_PADDING.left,
  }
}

const DEFAULT_POINT_SIZE = 2.5
const DEFAULT_POINT_SHAPE: PointShape = { kind: 'circle' }

/** Normalize point config: series overrides options overrides defaults. */
export function resolvePointConfig(
  seriesPoint?: PointConfig,
  optionsPoint?: PointConfig
): { shape: PointShape; size: number } {
  const merged: PointConfig = {
    shape: seriesPoint?.shape ?? optionsPoint?.shape ?? DEFAULT_POINT_SHAPE,
    size: seriesPoint?.size ?? optionsPoint?.size ?? DEFAULT_POINT_SIZE,
  }
  const shape =
    typeof merged.shape === 'string'
      ? normalizePointShapeString(merged.shape)
      : merged.shape ?? DEFAULT_POINT_SHAPE
  return {
    shape,
    size: merged.size ?? DEFAULT_POINT_SIZE,
  }
}

/** Convert string shorthand to PointShape (config → scene boundary). */
function normalizePointShapeString(
  s: string
): PointShape {
  switch (s) {
    case 'circle':
      return { kind: 'circle' }
    case 'square':
      return { kind: 'square' }
    case 'triangle':
      return { kind: 'triangle' }
    case 'diamond':
      return { kind: 'diamond' }
    default:
      return { kind: 'circle' }
  }
}
