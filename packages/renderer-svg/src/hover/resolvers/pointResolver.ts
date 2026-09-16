import type {
  DomainPoint,
  HoverResolver,
  HoverResolvedPoint,
  RuntimeHoverMetadata,
} from '../types'
import type { ContinuousScale, HoverSeries } from '@owlplot/core'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'

type Candidate = {
  resolved: HoverResolvedPoint
  distance: number
}

const NEIGHBORHOOD_RADIUS = 4

function yScaleForSeries(
  metadata: RuntimeHoverMetadata,
  series: HoverSeries
): ContinuousScale {
  if (!('yLeft' in metadata.scales)) return metadata.scales.y
  if (series.yAxis === 'right') return metadata.scales.yRight
  return metadata.scales.yLeft
}

function distanceToMouse(
  point: DomainPoint,
  metadata: RuntimeHoverMetadata,
  yScale: ContinuousScale,
  mouseSvgX: number,
  mouseSvgY: number
): number {
  const x = metadata.scales.x.forward(point.x)
  const y = yScale.forward(point.y)
  return Math.hypot(x - mouseSvgX, y - mouseSvgY)
}

function neighborhood(
  points: readonly DomainPoint[],
  targetX: number
): readonly DomainPoint[] {
  const nearest = binarySearchNearestByX(points, targetX)
  if (!nearest) return []
  const index = points.indexOf(nearest)
  if (index < 0) return []
  const start = Math.max(0, index - NEIGHBORHOOD_RADIUS)
  return points.slice(start, index + NEIGHBORHOOD_RADIUS + 1)
}

function nearestInSeries(
  series: HoverSeries,
  metadata: RuntimeHoverMetadata,
  domainX: number,
  mouseSvgX: number,
  mouseSvgY: number
): Candidate | null {
  let best: Candidate | null = null
  const yScale = yScaleForSeries(metadata, series)
  for (const point of neighborhood(series.sortedPoints, domainX)) {
    const distance = distanceToMouse(
      point,
      metadata,
      yScale,
      mouseSvgX,
      mouseSvgY
    )
    if (best && distance >= best.distance) continue
    best = { resolved: { seriesId: series.id, point }, distance }
  }
  return best
}

function nearerCandidate(
  current: Candidate | null,
  candidate: Candidate | null
): Candidate | null {
  return candidateDistance(candidate) < candidateDistance(current)
    ? candidate
    : current
}

function candidateDistance(candidate: Candidate | null): number {
  if (!candidate) return Infinity
  return candidate.distance
}

function resolvePoint(
  input: Parameters<HoverResolver['resolve']>[0]
): ReturnType<HoverResolver['resolve']> {
  const { mouseSvgX, mouseSvgY, metadata } = input
  const domainX = metadata.scales.x.invert(mouseSvgX)
  let best: Candidate | null = null
  for (const series of metadata.series) {
    const candidate = nearestInSeries(
      series,
      metadata,
      domainX,
      mouseSvgX,
      mouseSvgY
    )
    best = nearerCandidate(best, candidate)
  }
  if (!best) return { kind: 'none' }
  return { kind: 'points', points: [best.resolved], primaryIndex: 0 }
}

/**
 * POINT resolver: fast 2D nearest neighbor search using x-sorted narrowing + screen-space euclidean distance.
 * Algorithm:
 * 1. Binary search nearest index by x in x-sorted points
 * 2. Check index ± k (k=2..8 neighbors) for nearest by screen-space euclidean distance
 * 3. Pick global best across all series
 */
export function createPointResolver(): HoverResolver {
  return { resolve: resolvePoint }
}
