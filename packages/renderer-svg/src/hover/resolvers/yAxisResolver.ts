import type {
  DomainPoint,
  HoverResolver,
  HoverResolvedPoint,
  RuntimeHoverMetadata,
  RuntimeHoverMetadataDual,
} from '../types'
import type { ContinuousScale, HoverSeries } from '@owlplot/core'

function isDualMetadata(
  metadata: RuntimeHoverMetadata
): metadata is RuntimeHoverMetadataDual {
  return 'yLeft' in metadata.scales
}

function canonicalY(metadata: RuntimeHoverMetadata, mouseSvgY: number): number {
  if (isDualMetadata(metadata)) {
    return metadata.scales.yLeft.invert(mouseSvgY)
  }
  return metadata.scales.y.invert(mouseSvgY)
}

function canonicalYDomain(
  metadata: RuntimeHoverMetadata
): readonly [number, number] {
  if (isDualMetadata(metadata)) return metadata.yDomainLeft
  return metadata.yDomain
}

function clamp(value: number, domain: readonly [number, number]): number {
  return Math.max(domain[0], Math.min(domain[1], value))
}

function nearestPointByY(
  points: readonly DomainPoint[],
  targetY: number
): DomainPoint | null {
  let nearest: DomainPoint | null = null
  let nearestDistance = Infinity
  for (const point of points) {
    const distance = Math.abs(point.y - targetY)
    if (distance >= nearestDistance) continue
    nearest = point
    nearestDistance = distance
  }
  return nearest
}

function resolveSeriesPoints(
  series: readonly HoverSeries[],
  targetY: number
): HoverResolvedPoint[] {
  const resolved: HoverResolvedPoint[] = []
  for (const item of series) {
    const nearest = nearestPointByY(item.sortedPoints, targetY)
    if (nearest) resolved.push({ seriesId: item.id, point: nearest })
  }
  return resolved
}

function yScaleForSeries(
  metadata: RuntimeHoverMetadata,
  series: HoverSeries | undefined
): ContinuousScale {
  if (!isDualMetadata(metadata)) return metadata.scales.y
  if (series?.yAxis === 'right') return metadata.scales.yRight
  return metadata.scales.yLeft
}

function screenDistance(
  resolved: HoverResolvedPoint,
  metadata: RuntimeHoverMetadata,
  mouseSvgX: number,
  mouseSvgY: number
): number {
  const series = metadata.series.find(item => item.id === resolved.seriesId)
  const x = metadata.scales.x.forward(resolved.point.x)
  const y = yScaleForSeries(metadata, series).forward(resolved.point.y)
  return Math.hypot(x - mouseSvgX, y - mouseSvgY)
}

function resolvePrimaryIndex(
  points: readonly HoverResolvedPoint[],
  metadata: RuntimeHoverMetadata,
  mouseSvgX: number,
  mouseSvgY: number
): number {
  let primaryIndex = 0
  let minimumDistance = Infinity
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!
    const distance = screenDistance(point, metadata, mouseSvgX, mouseSvgY)
    if (distance >= minimumDistance) continue
    primaryIndex = index
    minimumDistance = distance
  }
  return primaryIndex
}

function resolveYAxis(
  input: Parameters<HoverResolver['resolve']>[0]
): ReturnType<HoverResolver['resolve']> {
  const { mouseSvgX, mouseSvgY, metadata } = input
  const domainY = canonicalY(metadata, mouseSvgY)
  const targetY = clamp(domainY, canonicalYDomain(metadata))
  const points = resolveSeriesPoints(metadata.series, targetY)
  if (points.length === 0) return { kind: 'none' }
  const primaryIndex = resolvePrimaryIndex(
    points,
    metadata,
    mouseSvgX,
    mouseSvgY
  )
  return { kind: 'points', points, primaryIndex }
}

/**
 * Y_AXIS resolver: horizontal slice projection.
 * Inverts y coordinate, finds nearest point per series at that y value using linear scan.
 * Sets primaryIndex to the point closest in screen-space to the cursor.
 */
export function createYAxisResolver(): HoverResolver {
  return { resolve: resolveYAxis }
}
