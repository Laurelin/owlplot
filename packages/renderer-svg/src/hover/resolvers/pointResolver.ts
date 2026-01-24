import type { HoverResolver } from '../types'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'

/**
 * POINT resolver: fast 2D nearest neighbor search using x-sorted narrowing + screen-space euclidean distance.
 * Algorithm:
 * 1. Binary search nearest index by x in x-sorted points
 * 2. Check index ± k (k=2..8 neighbors) for nearest by screen-space euclidean distance
 * 3. Pick global best across all series
 */
export function createPointResolver(): HoverResolver {
  return {
    resolve(input) {
      const { mouseSvgX, mouseSvgY, metadata } = input
      const { scales, series } = metadata

      if (series.length === 0) return { kind: 'none' }

      let bestPoint: {
        seriesId: string
        point: { x: number; y: number }
      } | null = null
      let bestDistance = Infinity
      const k = 4 // Check ±4 neighbors

      // Invert mouse coords to domain for binary search
      const domainX = metadata.xInvert(mouseSvgX)

      for (const s of series) {
        if (!s.sortedPoints || s.sortedPoints.length === 0) continue

        // Binary search nearest index by x (in domain space)
        const nearestByX = binarySearchNearestByX(s.sortedPoints, domainX)
        if (!nearestByX) continue

        const nearestIndex = s.sortedPoints.indexOf(nearestByX)
        if (nearestIndex === -1) continue

        // Check k-neighborhood (safely bounded)
        const startIdx = Math.max(0, nearestIndex - k)
        const endIdx = Math.min(s.sortedPoints.length - 1, nearestIndex + k)

        for (let i = startIdx; i <= endIdx; i++) {
          const candidate = s.sortedPoints[i]
          if (!candidate) continue

          // Screen-space euclidean distance
          const candidateSvgX = scales.x(candidate.x)
          const candidateSvgY = scales.y(candidate.y)
          const dx = candidateSvgX - mouseSvgX
          const dy = candidateSvgY - mouseSvgY
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < bestDistance) {
            bestDistance = distance
            bestPoint = { seriesId: s.id, point: candidate }
          }
        }
      }

      if (!bestPoint) return { kind: 'none' }

      return {
        kind: 'points' as const,
        points: [bestPoint],
        primaryIndex: 0,
      }
    },
  }
}
