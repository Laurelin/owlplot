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
    top: resolvePaddingSide(partial, 'top'),
    right: resolvePaddingSide(partial, 'right'),
    bottom: resolvePaddingSide(partial, 'bottom'),
    left: resolvePaddingSide(partial, 'left'),
  }
}

function resolvePaddingSide(
  partial: Partial<Padding> | undefined,
  side: keyof Padding
): number {
  return partial?.[side] ?? DEFAULT_PADDING[side]
}

const DEFAULT_POINT_SIZE = 2.5
const DEFAULT_POINT_SHAPE: PointShape = { kind: 'circle' }

function resolvePointValue<K extends keyof PointConfig>(
  seriesPoint: PointConfig | undefined,
  optionsPoint: PointConfig | undefined,
  key: K,
  fallback: NonNullable<PointConfig[K]>
): NonNullable<PointConfig[K]> {
  return seriesPoint?.[key] ?? optionsPoint?.[key] ?? fallback
}

/** Normalize point config: series overrides options overrides defaults. */
export function resolvePointConfig(
  seriesPoint?: PointConfig,
  optionsPoint?: PointConfig
): { shape: PointShape; size: number } {
  return {
    shape: normalizePointShape(
      resolvePointValue(seriesPoint, optionsPoint, 'shape', DEFAULT_POINT_SHAPE)
    ),
    size: resolvePointValue(
      seriesPoint,
      optionsPoint,
      'size',
      DEFAULT_POINT_SIZE
    ),
  }
}

function normalizePointShape(
  shape: NonNullable<PointConfig['shape']>
): PointShape {
  return typeof shape === 'string' ? normalizePointShapeString(shape) : shape
}

/** Convert string shorthand to PointShape (config → scene boundary). */
function normalizePointShapeString(s: string): PointShape {
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
