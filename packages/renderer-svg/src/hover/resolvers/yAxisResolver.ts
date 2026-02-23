import type {
  HoverResolver,
  HoverMetadataSingle,
  HoverMetadataDual,
} from '../types'

/**
 * Y_AXIS resolver: horizontal slice projection.
 * Inverts y coordinate, finds nearest point per series at that y value using linear scan.
 * Sets primaryIndex to the point closest in screen-space to the cursor.
 */
export function createYAxisResolver(): HoverResolver {
  return {
    resolve(input) {
      const { mouseSvgX, mouseSvgY, metadata } = input
      const { scales, series } = metadata
      const isDual = 'yLeft' in scales
      const yDomain = isDual
        ? (metadata as HoverMetadataDual).yDomainLeft
        : (metadata as HoverMetadataSingle).yDomain

      // Invert y coordinate to domain y (canonical: use left axis for slice)
      const domainY = isDual
        ? (scales as HoverMetadataDual['scales']).yLeft.invert(mouseSvgY)
        : (scales as HoverMetadataSingle['scales']).y.invert(mouseSvgY)
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

      const scalesDual = isDual ? (scales as HoverMetadataDual['scales']) : null
      const scalesSingle = !isDual
        ? (scales as HoverMetadataSingle['scales'])
        : null
      const getYScale = (s: (typeof series)[0]): ((v: number) => number) => {
        if (isDual && scalesDual)
          return s.yAxis === 'right'
            ? scalesDual.yRight.forward.bind(scalesDual.yRight)
            : scalesDual.yLeft.forward.bind(scalesDual.yLeft)
        return scalesSingle!.y.forward.bind(scalesSingle!.y)
      }

      // Set primaryIndex to point closest in screen-space to cursor
      let primaryIndex = 0
      let minScreenDistance = Infinity

      for (let i = 0; i < points.length; i++) {
        const point = points[i]!
        const s = series.find(ser => ser.id === point.seriesId)
        const yScale = s
          ? getYScale(s)
          : isDual && scalesDual
            ? scalesDual.yLeft.forward.bind(scalesDual.yLeft)
            : scalesSingle!.y.forward.bind(scalesSingle!.y)
        const pointSvgX = scales.x.forward(point.point.x)
        const pointSvgY = yScale(point.point.y)
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
