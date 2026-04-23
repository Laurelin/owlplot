import type {
  BoundaryRef,
  CartesianSeries,
  DominanceRegionsConfig,
  RegionBetweenSeriesConfig,
  RegionConfig,
  RegionConfigV2,
} from '../../config/types'
import type { CartesianScales } from '../cartesian2d/layout'
import { SceneNodeKind, type SceneNode } from '../../scene/types'
import type { ContinuousScale } from '../cartesian2d/scale'

type DomainPoint = { x: number; y: number }
type DomainRange = readonly [number, number]

type BoundarySegment = {
  x1: number
  x2: number
  y1: number
  y2: number
  slope: number
}

type ResolvedBoundary = {
  ref: BoundaryRef
  yAxis: 'left' | 'right'
  xDomain: DomainRange
  evaluate: (x: number) => number | null
  segments: BoundarySegment[]
}

type NormalizedRegionConfig = RegionConfigV2 & {
  legacySeries?: { upperSeriesId: string; lowerSeriesId: string }
}

const EPSILON = 1e-12

function resolveSeriesYAxis(series: CartesianSeries): 'left' | 'right' {
  return series.yAxis ?? 'left'
}

function resolveYScale(
  scales: CartesianScales,
  axis: 'left' | 'right'
): ContinuousScale {
  if ('yLeft' in scales && 'yRight' in scales) {
    return axis === 'right' ? scales.yRight : scales.yLeft
  }
  return scales.y
}

function normalizeRange(min: number, max: number): DomainRange {
  return min <= max ? [min, max] : [max, min]
}

function rangeOverlap(a: DomainRange, b: DomainRange): DomainRange | null {
  const min = Math.max(a[0], b[0])
  const max = Math.min(a[1], b[1])
  return max - min > EPSILON ? [min, max] : null
}

function dedupeSorted(values: number[]): number[] {
  if (values.length <= 1) return values.slice()
  const sorted = values.slice().sort((a, b) => a - b)
  const deduped: number[] = [sorted[0]!]
  for (let i = 1; i < sorted.length; i += 1) {
    const value = sorted[i]!
    if (Math.abs(value - deduped[deduped.length - 1]!) > EPSILON) {
      deduped.push(value)
    }
  }
  return deduped
}

function pointsToStrictlyIncreasing(points: CartesianSeries['points']): DomainPoint[] | null {
  if (points.length < 2) return null
  const normalized: DomainPoint[] = []
  for (const point of points) {
    if (
      point.y == null ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      return null
    }
    normalized.push({ x: point.x, y: point.y })
  }
  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i]!.x <= normalized[i - 1]!.x) return null
  }
  return normalized
}

function buildSegments(points: DomainPoint[]): BoundarySegment[] {
  const segments: BoundarySegment[] = []
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1]!
    const end = points[i]!
    const dx = end.x - start.x
    if (dx <= EPSILON) continue
    const slope = (end.y - start.y) / dx
    segments.push({ x1: start.x, x2: end.x, y1: start.y, y2: end.y, slope })
  }
  return segments
}

function evaluateSegmentsAtX(
  segments: BoundarySegment[],
  xDomain: DomainRange,
  x: number
): number | null {
  if (x < xDomain[0] - EPSILON || x > xDomain[1] + EPSILON) return null

  for (const segment of segments) {
    if (x < segment.x1 - EPSILON || x > segment.x2 + EPSILON) continue
    if (Math.abs(x - segment.x1) <= EPSILON) return segment.y1
    if (Math.abs(x - segment.x2) <= EPSILON) return segment.y2
    return segment.y1 + segment.slope * (x - segment.x1)
  }

  if (Math.abs(x - xDomain[1]) <= EPSILON) {
    const last = segments[segments.length - 1]
    return last?.y2 ?? null
  }
  return null
}

function isLegacyRegion(region: RegionConfig): region is RegionBetweenSeriesConfig {
  return 'upperSeriesId' in region && 'lowerSeriesId' in region
}

function normalizeRegionConfig(region: RegionConfig): NormalizedRegionConfig {
  if (isLegacyRegion(region)) {
    return {
      upper: { type: 'series', id: region.upperSeriesId },
      lower: { type: 'series', id: region.lowerSeriesId },
      fill: region.fill,
      opacity: region.opacity,
      legacySeries: {
        upperSeriesId: region.upperSeriesId,
        lowerSeriesId: region.lowerSeriesId,
      },
    }
  }
  return region
}

function resolveBoundary(
  boundary: BoundaryRef,
  requestedAxis: 'left' | 'right' | undefined,
  byId: Map<string, CartesianSeries>,
  scales: CartesianScales
): ResolvedBoundary | null {
  const xDomain = normalizeRange(scales.x.domain[0], scales.x.domain[1])
  if (boundary.type === 'series') {
    const series = byId.get(boundary.id)
    if (!series) return null
    const points = pointsToStrictlyIncreasing(series.points)
    if (!points) return null
    const segments = buildSegments(points)
    if (segments.length === 0) return null
    const axis = resolveSeriesYAxis(series)
    const domain: DomainRange = [points[0]!.x, points[points.length - 1]!.x]
    return {
      ref: boundary,
      yAxis: axis,
      xDomain: domain,
      evaluate: x => evaluateSegmentsAtX(segments, domain, x),
      segments,
    }
  }

  const axis = requestedAxis ?? 'left'
  const yScale = resolveYScale(scales, axis)
  const yDomain = normalizeRange(yScale.domain[0], yScale.domain[1])
  const yValue = boundary.type === 'plotTop' ? yDomain[1] : boundary.type === 'plotBottom' ? yDomain[0] : boundary.value
  if (!Number.isFinite(yValue)) return null

  const constantSegments: BoundarySegment[] = [
    { x1: xDomain[0], x2: xDomain[1], y1: yValue, y2: yValue, slope: 0 },
  ]
  return {
    ref: boundary,
    yAxis: axis,
    xDomain,
    evaluate: x => evaluateSegmentsAtX(constantSegments, xDomain, x),
    segments: constantSegments,
  }
}

function collectBreakpoints(
  upper: ResolvedBoundary,
  lower: ResolvedBoundary,
  xMin: number | undefined,
  xMax: number | undefined
): number[] {
  const overlapUL = rangeOverlap(upper.xDomain, lower.xDomain)
  if (!overlapUL) return []

  const clip = xMin != null && xMax != null ? normalizeRange(xMin, xMax) : xMin != null ? normalizeRange(xMin, overlapUL[1]) : xMax != null ? normalizeRange(overlapUL[0], xMax) : null
  const overlap = clip ? rangeOverlap(overlapUL, clip) : overlapUL
  if (!overlap) return []

  const values: number[] = [overlap[0], overlap[1]]

  const collectSegmentEdges = (segments: BoundarySegment[]): void => {
    for (const segment of segments) {
      if (segment.x1 > overlap[1] + EPSILON || segment.x2 < overlap[0] - EPSILON) {
        continue
      }
      values.push(
        Math.max(overlap[0], Math.min(overlap[1], segment.x1)),
        Math.max(overlap[0], Math.min(overlap[1], segment.x2))
      )
    }
  }
  collectSegmentEdges(upper.segments)
  collectSegmentEdges(lower.segments)

  for (const upperSegment of upper.segments) {
    for (const lowerSegment of lower.segments) {
      const localMin = Math.max(overlap[0], upperSegment.x1, lowerSegment.x1)
      const localMax = Math.min(overlap[1], upperSegment.x2, lowerSegment.x2)
      if (localMax - localMin <= EPSILON) continue

      const slopeDiff = upperSegment.slope - lowerSegment.slope
      if (Math.abs(slopeDiff) <= EPSILON) continue
      const upperIntercept = upperSegment.y1 - upperSegment.slope * upperSegment.x1
      const lowerIntercept = lowerSegment.y1 - lowerSegment.slope * lowerSegment.x1
      const intersectionX = (lowerIntercept - upperIntercept) / slopeDiff
      if (
        intersectionX > localMin + EPSILON &&
        intersectionX < localMax - EPSILON
      ) {
        values.push(intersectionX)
      }
    }
  }

  return dedupeSorted(values)
}

function buildSlabPolygons(
  upper: ResolvedBoundary,
  lower: ResolvedBoundary,
  breakpoints: number[]
): DomainPoint[][] {
  const polygons: DomainPoint[][] = []
  let upperPath: DomainPoint[] = []
  let lowerPath: DomainPoint[] = []

  const flush = (): void => {
    if (upperPath.length < 2 || lowerPath.length < 2) {
      upperPath = []
      lowerPath = []
      return
    }
    polygons.push([...upperPath, ...lowerPath.slice().reverse()])
    upperPath = []
    lowerPath = []
  }

  for (let i = 1; i < breakpoints.length; i += 1) {
    const xLeft = breakpoints[i - 1]!
    const xRight = breakpoints[i]!
    if (xRight - xLeft <= EPSILON) continue

    const upperLeft = upper.evaluate(xLeft)
    const upperRight = upper.evaluate(xRight)
    const lowerLeft = lower.evaluate(xLeft)
    const lowerRight = lower.evaluate(xRight)
    const hasInvalid =
      upperLeft == null ||
      upperRight == null ||
      lowerLeft == null ||
      lowerRight == null ||
      !Number.isFinite(upperLeft) ||
      !Number.isFinite(upperRight) ||
      !Number.isFinite(lowerLeft) ||
      !Number.isFinite(lowerRight)
    if (hasInvalid) {
      flush()
      continue
    }

    const zeroArea =
      Math.abs(upperLeft - lowerLeft) <= EPSILON &&
      Math.abs(upperRight - lowerRight) <= EPSILON
    if (zeroArea) {
      flush()
      continue
    }

    if (upperPath.length === 0) {
      upperPath = [
        { x: xLeft, y: upperLeft },
        { x: xRight, y: upperRight },
      ]
      lowerPath = [
        { x: xLeft, y: lowerLeft },
        { x: xRight, y: lowerRight },
      ]
      continue
    }

    const prevX = upperPath[upperPath.length - 1]!.x
    if (Math.abs(prevX - xLeft) > EPSILON) {
      flush()
      upperPath = [
        { x: xLeft, y: upperLeft },
        { x: xRight, y: upperRight },
      ]
      lowerPath = [
        { x: xLeft, y: lowerLeft },
        { x: xRight, y: lowerRight },
      ]
      continue
    }

    upperPath.push({ x: xRight, y: upperRight })
    lowerPath.push({ x: xRight, y: lowerRight })
  }

  flush()
  return polygons
}

function buildPolygonPath(points: DomainPoint[]): string {
  if (points.length < 3) return ''
  const first = points[0]!
  const rest = points
    .slice(1)
    .map(point => `L ${point.x} ${point.y}`)
    .join(' ')
  return `M ${first.x} ${first.y}${rest.length > 0 ? ` ${rest}` : ''} Z`
}

function emitNodes(
  region: NormalizedRegionConfig,
  regionIndex: number,
  polygons: DomainPoint[][],
  scales: CartesianScales,
  axis: 'left' | 'right'
): SceneNode[] {
  const yScale = resolveYScale(scales, axis)
  return polygons
    .map((polygon, polygonIndex) => {
      const projectedPoints = polygon.map(point => ({
        x: scales.x.forward(point.x),
        y: yScale.forward(point.y),
      }))
      if (
        projectedPoints.some(
          point => !Number.isFinite(point.x) || !Number.isFinite(point.y)
        )
      ) {
        return null
      }
      const d = buildPolygonPath(projectedPoints)
      if (d.length === 0) return null

      const id =
        polygonIndex === 0
          ? `__region__:${regionIndex}`
          : `__region__:${regionIndex}:${polygonIndex}`

      return {
        kind: SceneNodeKind.PATH,
        id,
        d,
        style: {
          fill: region.fill,
          opacity: region.opacity,
          stroke: { type: 'solid', color: 'none' },
        },
        metadata: {
          role: 'region',
          upper: region.upper,
          lower: region.lower,
          upperSeriesId: region.legacySeries?.upperSeriesId,
          lowerSeriesId: region.legacySeries?.lowerSeriesId,
          yAxis: axis,
        },
      } satisfies SceneNode
    })
    .filter((node): node is SceneNode => node != null)
}

export function compileDominanceRegions(
  dominance: DominanceRegionsConfig | undefined,
  seriesList: CartesianSeries[]
): RegionConfigV2[] {
  if (!dominance || dominance.seriesIds.length < 2 || dominance.fills.length === 0) {
    return []
  }

  const byId = new Map(seriesList.map(series => [series.id, series]))
  const selected = dominance.seriesIds
    .map(id => byId.get(id))
    .filter((series): series is CartesianSeries => series != null)
  if (selected.length < 2 || selected.length !== dominance.seriesIds.length) {
    return []
  }

  const pointsBySeries = new Map<string, DomainPoint[]>()
  for (const series of selected) {
    const points = pointsToStrictlyIncreasing(series.points)
    if (!points) return []
    pointsBySeries.set(series.id, points)
  }

  const axis = dominance.yAxis ?? resolveSeriesYAxis(selected[0]!)
  if (selected.some(series => resolveSeriesYAxis(series) !== axis)) return []

  const seriesDomains = selected.map(series => {
    const points = pointsBySeries.get(series.id)!
    return [points[0]!.x, points[points.length - 1]!.x] as const
  })
  const overlapMin = Math.max(...seriesDomains.map(domain => domain[0]))
  const overlapMax = Math.min(...seriesDomains.map(domain => domain[1]))
  if (!(overlapMax > overlapMin)) return []

  const breakpoints: number[] = [overlapMin, overlapMax]
  for (const series of selected) {
    const points = pointsBySeries.get(series.id)!
    for (const point of points) {
      if (point.x >= overlapMin - EPSILON && point.x <= overlapMax + EPSILON) {
        breakpoints.push(Math.max(overlapMin, Math.min(overlapMax, point.x)))
      }
    }
  }

  const segmentsBySeries = new Map(
    selected.map(series => [series.id, buildSegments(pointsBySeries.get(series.id)!)] as const)
  )
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const segmentsA = segmentsBySeries.get(selected[i]!.id) ?? []
      const segmentsB = segmentsBySeries.get(selected[j]!.id) ?? []
      for (const segA of segmentsA) {
        for (const segB of segmentsB) {
          const localMin = Math.max(overlapMin, segA.x1, segB.x1)
          const localMax = Math.min(overlapMax, segA.x2, segB.x2)
          if (localMax - localMin <= EPSILON) continue

          const slopeDiff = segA.slope - segB.slope
          if (Math.abs(slopeDiff) <= EPSILON) continue
          const interceptA = segA.y1 - segA.slope * segA.x1
          const interceptB = segB.y1 - segB.slope * segB.x1
          const intersectionX = (interceptB - interceptA) / slopeDiff
          if (
            intersectionX > localMin + EPSILON &&
            intersectionX < localMax - EPSILON
          ) {
            breakpoints.push(intersectionX)
          }
        }
      }
    }
  }

  const sorted = dedupeSorted(breakpoints)
  if (sorted.length < 2) return []

  const inputRank = new Map(dominance.seriesIds.map((id, index) => [id, index] as const))
  const tieBreak = dominance.tieBreak ?? 'stable-input'
  const result: RegionConfigV2[] = []

  for (let i = 1; i < sorted.length; i += 1) {
    const xMin = sorted[i - 1]!
    const xMax = sorted[i]!
    if (xMax - xMin <= EPSILON) continue
    const mid = xMin + (xMax - xMin) / 2

    const ranked = selected
      .map(series => {
        const points = pointsBySeries.get(series.id)!
        const segments = segmentsBySeries.get(series.id) ?? buildSegments(points)
        const domain: DomainRange = [points[0]!.x, points[points.length - 1]!.x]
        const y = evaluateSegmentsAtX(segments, domain, mid)
        return y == null ? null : { id: series.id, y }
      })
      .filter((item): item is { id: string; y: number } => item != null)
    if (ranked.length !== selected.length) continue

    ranked.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y
      if (tieBreak === 'series-id') return a.id.localeCompare(b.id)
      return (inputRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (inputRank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    })

    for (let bandIndex = 0; bandIndex < ranked.length - 1; bandIndex += 1) {
      const lowerId = ranked[bandIndex]!.id
      const upperId = ranked[bandIndex + 1]!.id
      const fill = dominance.fills[Math.min(bandIndex, dominance.fills.length - 1)]!
      result.push({
        upper: { type: 'series', id: upperId },
        lower: { type: 'series', id: lowerId },
        fill,
        opacity: dominance.opacity,
        yAxis: axis,
        xMin,
        xMax,
      })
    }
  }

  return result
}

export function buildRegionNodes(
  regionConfigs: RegionConfig[] | undefined,
  dominance: DominanceRegionsConfig | undefined,
  seriesList: CartesianSeries[],
  scales: CartesianScales
): SceneNode[] {
  const explicit = (regionConfigs ?? []).map(normalizeRegionConfig)
  const dominanceRegions = compileDominanceRegions(dominance, seriesList)
  const regions: NormalizedRegionConfig[] = [
    ...explicit,
    ...dominanceRegions.map(normalizeRegionConfig),
  ]
  if (regions.length === 0) return []

  const byId = new Map(seriesList.map(series => [series.id, series]))
  const nodes: SceneNode[] = []

  regions.forEach((region, regionIndex) => {
    const upper = resolveBoundary(region.upper, region.yAxis, byId, scales)
    const lower = resolveBoundary(region.lower, region.yAxis, byId, scales)
    if (!upper || !lower) return
    if (upper.yAxis !== lower.yAxis) return

    const breakpoints = collectBreakpoints(upper, lower, region.xMin, region.xMax)
    if (breakpoints.length < 2) return

    const polygons = buildSlabPolygons(upper, lower, breakpoints)
    if (polygons.length === 0) return

    nodes.push(
      ...emitNodes(region, regionIndex, polygons, scales, upper.yAxis)
    )
  })

  return nodes
}
