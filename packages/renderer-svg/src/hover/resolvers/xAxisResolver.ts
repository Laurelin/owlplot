import type { HoverResolver } from '../types'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'

/**
 * X_AXIS resolver: vertical slice projection.
 * Inverts x coordinate, finds nearest point per series at that x value.
 */
export function createXAxisResolver(): HoverResolver {
  return {
    resolve(input) {
      const { mouseSvgX, metadata } = input
      const { xInvert, xDomain, series } = metadata

      // Clamp to plot rect (should be done in hoverManager, but double-check)
      const domainX = xInvert(mouseSvgX)
      const [xMin, xMax] = xDomain
      const clampedX = Math.max(xMin, Math.min(xMax, domainX))

      const points: Array<{
        seriesId: string
        point: { x: number; y: number }
      }> = []

      for (const s of series) {
        if (!s.sortedPoints || s.sortedPoints.length === 0) continue
        const nearest = binarySearchNearestByX(s.sortedPoints, clampedX)
        if (!nearest) continue
        points.push({ seriesId: s.id, point: nearest })
      }

      if (points.length === 0) return { kind: 'none' }

      // Set primaryIndex to first series (deterministic)
      return {
        kind: 'points',
        points,
        primaryIndex: 0,
      }
    },
  }
}
