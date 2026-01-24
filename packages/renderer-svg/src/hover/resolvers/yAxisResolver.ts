import type { HoverResolver } from '../types'

/**
 * Y_AXIS resolver: horizontal slice projection.
 * Inverts y coordinate, finds nearest point per series at that y value using linear scan.
 * Sets primaryIndex to the point closest in screen-space to the cursor.
 */
export function createYAxisResolver(): HoverResolver {
  return {
    resolve(input) {
      const { mouseSvgX, mouseSvgY, metadata } = input
      const { yInvert, yDomain, scales, series } = metadata

      // Invert y coordinate to domain y
      const domainY = yInvert(mouseSvgY)
      const [yMin, yMax] = yDomain
      const clampedY = Math.max(yMin, Math.min(yMax, domainY))

      const points: Array<{
        seriesId: string
        point: { x: number; y: number }
      }> = []

      // Linear scan per series (O(n) - no binary search without y-sorted metadata)
      for (const s of series) {
        if (!s.sortedPoints || s.sortedPoints.length === 0) continue

        let nearest: { x: number; y: number } | null = null
        let nearestDistance = Infinity

        for (const point of s.sortedPoints) {
          const distance = Math.abs(point.y - clampedY)
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearest = point
          }
        }

        if (nearest) {
          points.push({ seriesId: s.id, point: nearest })
        }
      }

      if (points.length === 0) return { kind: 'none' }

      // Set primaryIndex to point closest in screen-space to cursor
      let primaryIndex = 0
      let minScreenDistance = Infinity

      for (let i = 0; i < points.length; i++) {
        const point = points[i]!
        const pointSvgX = scales.x(point.point.x)
        const pointSvgY = scales.y(point.point.y)
        const dx = pointSvgX - mouseSvgX
        const dy = pointSvgY - mouseSvgY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < minScreenDistance) {
          minScreenDistance = distance
          primaryIndex = i
        }
      }

      return {
        kind: 'points',
        points,
        primaryIndex,
      }
    },
  }
}
