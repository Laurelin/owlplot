import type { HoverResolver, HoverResolvedPoint } from '../types'
import type { HoverSeries } from '@owlplot/core'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'

function clamp(value: number, domain: readonly [number, number]): number {
  return Math.max(domain[0], Math.min(domain[1], value))
}

function resolveSeriesAtX(
  series: readonly HoverSeries[],
  targetX: number
): HoverResolvedPoint[] {
  const points: HoverResolvedPoint[] = []
  for (const item of series) {
    const nearest = binarySearchNearestByX(item.sortedPoints, targetX)
    if (nearest) points.push({ seriesId: item.id, point: nearest })
  }
  return points
}

function resolveXAxis(
  input: Parameters<HoverResolver['resolve']>[0]
): ReturnType<HoverResolver['resolve']> {
  const { mouseSvgX, metadata } = input
  const domainX = metadata.scales.x.invert(mouseSvgX)
  const points = resolveSeriesAtX(
    metadata.series,
    clamp(domainX, metadata.xDomain)
  )
  if (points.length === 0) return { kind: 'none' }
  return { kind: 'points', points, primaryIndex: 0 }
}

/**
 * X_AXIS resolver: vertical slice projection.
 * Inverts x coordinate, finds nearest point per series at that x value.
 */
export function createXAxisResolver(): HoverResolver {
  return { resolve: resolveXAxis }
}
