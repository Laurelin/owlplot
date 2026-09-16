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

function isFiniteDomainPoint(
  point: CartesianSeries['points'][number]
): point is DomainPoint {
  return (
    point.y !== null && Number.isFinite(point.x) && Number.isFinite(point.y)
  )
}

function hasStrictlyIncreasingX(points: DomainPoint[]): boolean {
  for (let index = 1; index < points.length; index += 1) {
    if (points[index]!.x <= points[index - 1]!.x) return false
  }
  return true
}

function pointsToStrictlyIncreasing(
  points: CartesianSeries['points']
): DomainPoint[] | null {
  if (points.length < 2) return null
  if (!points.every(isFiniteDomainPoint)) return null
  const normalized = points.map(point => ({ x: point.x, y: point.y }))
  if (!hasStrictlyIncreasingX(normalized)) return null
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

type SegmentEvaluation = { type: 'outside' } | { type: 'value'; value: number }

function evaluateSegment(
  segment: BoundarySegment,
  x: number
): SegmentEvaluation {
  if (x < segment.x1 - EPSILON || x > segment.x2 + EPSILON) {
    return { type: 'outside' }
  }
  if (Math.abs(x - segment.x1) <= EPSILON) {
    return { type: 'value', value: segment.y1 }
  }
  if (Math.abs(x - segment.x2) <= EPSILON) {
    return { type: 'value', value: segment.y2 }
  }
  return {
    type: 'value',
    value: segment.y1 + segment.slope * (x - segment.x1),
  }
}

function evaluateSegmentsAtX(
  segments: BoundarySegment[],
  xDomain: DomainRange,
  x: number
): number | null {
  if (x < xDomain[0] - EPSILON || x > xDomain[1] + EPSILON) return null

  for (const segment of segments) {
    const evaluation = evaluateSegment(segment, x)
    if (evaluation.type === 'value') return evaluation.value
  }
  return null
}

function isLegacyRegion(
  region: RegionConfig
): region is RegionBetweenSeriesConfig {
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

function resolveSeriesBoundary(
  boundary: Extract<BoundaryRef, { type: 'series' }>,
  byId: Map<string, CartesianSeries>
): ResolvedBoundary | null {
  const series = byId.get(boundary.id)
  if (!series) return null
  const points = pointsToStrictlyIncreasing(series.points)
  if (!points) return null
  const segments = buildSegments(points)
  if (segments.length === 0) return null
  const domain: DomainRange = [points[0]!.x, points[points.length - 1]!.x]
  return {
    ref: boundary,
    yAxis: resolveSeriesYAxis(series),
    xDomain: domain,
    evaluate: x => evaluateSegmentsAtX(segments, domain, x),
    segments,
  }
}

function resolveConstantValue(
  boundary: Exclude<BoundaryRef, { type: 'series' }>,
  yDomain: DomainRange
): number {
  switch (boundary.type) {
    case 'plotTop':
      return yDomain[1]
    case 'plotBottom':
      return yDomain[0]
    case 'constant':
      return boundary.value
  }
}

function resolveConstantBoundary(
  boundary: Exclude<BoundaryRef, { type: 'series' }>,
  requestedAxis: 'left' | 'right' | undefined,
  scales: CartesianScales
): ResolvedBoundary | null {
  const axis = requestedAxis ?? 'left'
  const yScale = resolveYScale(scales, axis)
  const yDomain = normalizeRange(yScale.domain[0], yScale.domain[1])
  const yValue = resolveConstantValue(boundary, yDomain)
  if (!Number.isFinite(yValue)) return null
  const xDomain = normalizeRange(scales.x.domain[0], scales.x.domain[1])
  const segments: BoundarySegment[] = [
    { x1: xDomain[0], x2: xDomain[1], y1: yValue, y2: yValue, slope: 0 },
  ]
  return {
    ref: boundary,
    yAxis: axis,
    xDomain,
    evaluate: x => evaluateSegmentsAtX(segments, xDomain, x),
    segments,
  }
}

function resolveBoundary(
  boundary: BoundaryRef,
  requestedAxis: 'left' | 'right' | undefined,
  byId: Map<string, CartesianSeries>,
  scales: CartesianScales
): ResolvedBoundary | null {
  if (boundary.type === 'series') {
    return resolveSeriesBoundary(boundary, byId)
  }
  return resolveConstantBoundary(boundary, requestedAxis, scales)
}

function resolveClippedOverlap(
  upper: ResolvedBoundary,
  lower: ResolvedBoundary,
  xMin: number | undefined,
  xMax: number | undefined
): DomainRange | null {
  const overlap = rangeOverlap(upper.xDomain, lower.xDomain)
  if (!overlap) return null
  const clip = normalizeRange(xMin ?? overlap[0], xMax ?? overlap[1])
  return rangeOverlap(overlap, clip)
}

function collectSegmentEdges(
  values: number[],
  segments: BoundarySegment[],
  overlap: DomainRange
): void {
  for (const segment of segments) {
    if (
      segment.x1 > overlap[1] + EPSILON ||
      segment.x2 < overlap[0] - EPSILON
    ) {
      continue
    }
    values.push(
      Math.max(overlap[0], Math.min(overlap[1], segment.x1)),
      Math.max(overlap[0], Math.min(overlap[1], segment.x2))
    )
  }
}

function findSegmentIntersection(
  upper: BoundarySegment,
  lower: BoundarySegment,
  overlap: DomainRange
): number | null {
  const localMin = Math.max(overlap[0], upper.x1, lower.x1)
  const localMax = Math.min(overlap[1], upper.x2, lower.x2)
  if (localMax - localMin <= EPSILON) return null
  const slopeDiff = upper.slope - lower.slope
  if (Math.abs(slopeDiff) <= EPSILON) return null
  const upperIntercept = upper.y1 - upper.slope * upper.x1
  const lowerIntercept = lower.y1 - lower.slope * lower.x1
  const x = (lowerIntercept - upperIntercept) / slopeDiff
  return x > localMin + EPSILON && x < localMax - EPSILON ? x : null
}

function collectIntersections(
  values: number[],
  upper: BoundarySegment[],
  lower: BoundarySegment[],
  overlap: DomainRange
): void {
  for (const upperSegment of upper) {
    for (const lowerSegment of lower) {
      const intersection = findSegmentIntersection(
        upperSegment,
        lowerSegment,
        overlap
      )
      if (intersection !== null) values.push(intersection)
    }
  }
}

function collectBreakpoints(
  upper: ResolvedBoundary,
  lower: ResolvedBoundary,
  xMin: number | undefined,
  xMax: number | undefined
): number[] {
  const overlap = resolveClippedOverlap(upper, lower, xMin, xMax)
  if (!overlap) return []
  const values: number[] = [overlap[0], overlap[1]]
  collectSegmentEdges(values, upper.segments, overlap)
  collectSegmentEdges(values, lower.segments, overlap)
  collectIntersections(values, upper.segments, lower.segments, overlap)
  return dedupeSorted(values)
}

type Slab =
  | { type: 'invalid' }
  | { type: 'zero-area' }
  | {
      type: 'valid'
      xLeft: number
      xRight: number
      upperLeft: number
      upperRight: number
      lowerLeft: number
      lowerRight: number
    }

type PolygonPaths = {
  upper: DomainPoint[]
  lower: DomainPoint[]
}

function areFiniteValues(values: Array<number | null>): values is number[] {
  return values.every(value => value !== null && Number.isFinite(value))
}

function evaluateSlab(
  upper: ResolvedBoundary,
  lower: ResolvedBoundary,
  xLeft: number,
  xRight: number
): Slab {
  const values = [
    upper.evaluate(xLeft),
    upper.evaluate(xRight),
    lower.evaluate(xLeft),
    lower.evaluate(xRight),
  ]
  if (!areFiniteValues(values)) return { type: 'invalid' }
  const [upperLeft, upperRight, lowerLeft, lowerRight] = values
  if (
    Math.abs(upperLeft! - lowerLeft!) <= EPSILON &&
    Math.abs(upperRight! - lowerRight!) <= EPSILON
  ) {
    return { type: 'zero-area' }
  }
  return {
    type: 'valid',
    xLeft,
    xRight,
    upperLeft: upperLeft!,
    upperRight: upperRight!,
    lowerLeft: lowerLeft!,
    lowerRight: lowerRight!,
  }
}

function startPolygonPaths(
  slab: Extract<Slab, { type: 'valid' }>
): PolygonPaths {
  return {
    upper: [
      { x: slab.xLeft, y: slab.upperLeft },
      { x: slab.xRight, y: slab.upperRight },
    ],
    lower: [
      { x: slab.xLeft, y: slab.lowerLeft },
      { x: slab.xRight, y: slab.lowerRight },
    ],
  }
}

function flushPolygon(
  polygons: DomainPoint[][],
  paths: PolygonPaths
): PolygonPaths {
  if (paths.upper.length >= 2 && paths.lower.length >= 2) {
    polygons.push([...paths.upper, ...paths.lower.slice().reverse()])
  }
  return { upper: [], lower: [] }
}

function appendSlab(
  polygons: DomainPoint[][],
  paths: PolygonPaths,
  slab: Extract<Slab, { type: 'valid' }>
): PolygonPaths {
  if (paths.upper.length === 0) return startPolygonPaths(slab)
  const previousX = paths.upper[paths.upper.length - 1]!.x
  if (Math.abs(previousX - slab.xLeft) > EPSILON) {
    flushPolygon(polygons, paths)
    return startPolygonPaths(slab)
  }
  paths.upper.push({ x: slab.xRight, y: slab.upperRight })
  paths.lower.push({ x: slab.xRight, y: slab.lowerRight })
  return paths
}

function buildSlabPolygons(
  upper: ResolvedBoundary,
  lower: ResolvedBoundary,
  breakpoints: number[]
): DomainPoint[][] {
  const polygons: DomainPoint[][] = []
  let paths: PolygonPaths = { upper: [], lower: [] }
  for (let i = 1; i < breakpoints.length; i += 1) {
    const xLeft = breakpoints[i - 1]!
    const xRight = breakpoints[i]!
    if (xRight - xLeft <= EPSILON) continue
    const slab = evaluateSlab(upper, lower, xLeft, xRight)
    if (slab.type === 'valid') {
      paths = appendSlab(polygons, paths, slab)
    } else {
      paths = flushPolygon(polygons, paths)
    }
  }
  flushPolygon(polygons, paths)
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
  const nodes: SceneNode[] = []
  polygons.forEach((polygon, polygonIndex) => {
    const projectedPoints = polygon.map(point => ({
      x: scales.x.forward(point.x),
      y: yScale.forward(point.y),
    }))
    if (
      projectedPoints.some(
        point => !Number.isFinite(point.x) || !Number.isFinite(point.y)
      )
    ) {
      return
    }
    const d = buildPolygonPath(projectedPoints)
    if (d.length === 0) return

    const id =
      polygonIndex === 0
        ? `__region__:${regionIndex}`
        : `__region__:${regionIndex}:${polygonIndex}`

    nodes.push({
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
    })
  })
  return nodes
}

type DominanceSeriesContext = {
  selected: CartesianSeries[]
  pointsBySeries: Map<string, DomainPoint[]>
  segmentsBySeries: Map<string, BoundarySegment[]>
}

function resolveDominanceSeries(
  dominance: DominanceRegionsConfig,
  seriesList: CartesianSeries[]
): DominanceSeriesContext | null {
  if (dominance.seriesIds.length < 2 || dominance.fills.length === 0) {
    return null
  }
  const byId = new Map(seriesList.map(series => [series.id, series]))
  const selected = dominance.seriesIds
    .map(id => byId.get(id))
    .filter((series): series is CartesianSeries => series !== undefined)
  if (selected.length !== dominance.seriesIds.length) return null
  const pointsBySeries = new Map<string, DomainPoint[]>()
  for (const series of selected) {
    const points = pointsToStrictlyIncreasing(series.points)
    if (!points) return null
    pointsBySeries.set(series.id, points)
  }
  return {
    selected,
    pointsBySeries,
    segmentsBySeries: new Map(
      selected.map(series => [
        series.id,
        buildSegments(pointsBySeries.get(series.id)!),
      ])
    ),
  }
}

function resolveDominanceAxis(
  dominance: DominanceRegionsConfig,
  selected: CartesianSeries[]
): 'left' | 'right' | null {
  const axis = dominance.yAxis ?? resolveSeriesYAxis(selected[0]!)
  return selected.every(series => resolveSeriesYAxis(series) === axis)
    ? axis
    : null
}

function resolveSeriesOverlap(
  context: DominanceSeriesContext
): DomainRange | null {
  const domains = context.selected.map(series => {
    const points = context.pointsBySeries.get(series.id)!
    return [points[0]!.x, points[points.length - 1]!.x] as const
  })
  const min = Math.max(...domains.map(domain => domain[0]))
  const max = Math.min(...domains.map(domain => domain[1]))
  return max > min ? [min, max] : null
}

function collectSeriesPointBreakpoints(
  values: number[],
  context: DominanceSeriesContext,
  overlap: DomainRange
): void {
  for (const series of context.selected) {
    const points = context.pointsBySeries.get(series.id)!
    for (const point of points) {
      if (point.x < overlap[0] - EPSILON || point.x > overlap[1] + EPSILON) {
        continue
      }
      values.push(Math.max(overlap[0], Math.min(overlap[1], point.x)))
    }
  }
}

function collectPairIntersections(
  values: number[],
  context: DominanceSeriesContext,
  overlap: DomainRange
): void {
  for (let left = 0; left < context.selected.length; left += 1) {
    for (let right = left + 1; right < context.selected.length; right += 1) {
      collectIntersections(
        values,
        context.segmentsBySeries.get(context.selected[left]!.id)!,
        context.segmentsBySeries.get(context.selected[right]!.id)!,
        overlap
      )
    }
  }
}

type RankedSeries = { id: string; y: number }

function rankAtX(
  context: DominanceSeriesContext,
  x: number,
  inputRank: Map<string, number>,
  tieBreak: 'stable-input' | 'series-id'
): RankedSeries[] | null {
  const ranked = context.selected.flatMap(series => {
    const points = context.pointsBySeries.get(series.id)!
    const domain: DomainRange = [points[0]!.x, points[points.length - 1]!.x]
    const y = evaluateSegmentsAtX(
      context.segmentsBySeries.get(series.id) ?? [],
      domain,
      x
    )
    return y === null ? [] : [{ id: series.id, y }]
  })
  if (ranked.length !== context.selected.length) return null
  ranked.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    if (tieBreak === 'series-id') return a.id.localeCompare(b.id)
    return (
      (inputRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (inputRank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    )
  })
  return ranked
}

function buildRankRegions(
  dominance: DominanceRegionsConfig,
  ranked: RankedSeries[],
  axis: 'left' | 'right',
  xMin: number,
  xMax: number
): RegionConfigV2[] {
  const regions: RegionConfigV2[] = []
  for (let index = 0; index < ranked.length - 1; index += 1) {
    regions.push({
      upper: { type: 'series', id: ranked[index + 1]!.id },
      lower: { type: 'series', id: ranked[index]!.id },
      fill: dominance.fills[Math.min(index, dominance.fills.length - 1)]!,
      opacity: dominance.opacity,
      yAxis: axis,
      xMin,
      xMax,
    })
  }
  return regions
}

function compileRankSlabs(
  dominance: DominanceRegionsConfig,
  context: DominanceSeriesContext,
  axis: 'left' | 'right',
  breakpoints: number[]
): RegionConfigV2[] {
  const inputRank = new Map(dominance.seriesIds.map((id, index) => [id, index]))
  const tieBreak = dominance.tieBreak ?? 'stable-input'
  const result: RegionConfigV2[] = []
  for (let index = 1; index < breakpoints.length; index += 1) {
    const xMin = breakpoints[index - 1]!
    const xMax = breakpoints[index]!
    if (xMax - xMin <= EPSILON) continue
    const ranked = rankAtX(
      context,
      xMin + (xMax - xMin) / 2,
      inputRank,
      tieBreak
    )
    if (ranked) {
      result.push(...buildRankRegions(dominance, ranked, axis, xMin, xMax))
    }
  }
  return result
}

export function compileDominanceRegions(
  dominance: DominanceRegionsConfig | undefined,
  seriesList: CartesianSeries[]
): RegionConfigV2[] {
  if (!dominance) return []
  const context = resolveDominanceSeries(dominance, seriesList)
  if (!context) return []
  const axis = resolveDominanceAxis(dominance, context.selected)
  if (!axis) return []
  const overlap = resolveSeriesOverlap(context)
  if (!overlap) return []
  const breakpoints = [overlap[0], overlap[1]]
  collectSeriesPointBreakpoints(breakpoints, context, overlap)
  collectPairIntersections(breakpoints, context, overlap)
  return compileRankSlabs(dominance, context, axis, dedupeSorted(breakpoints))
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

    const breakpoints = collectBreakpoints(
      upper,
      lower,
      region.xMin,
      region.xMax
    )
    if (breakpoints.length < 2) return

    const polygons = buildSlabPolygons(upper, lower, breakpoints)
    if (polygons.length === 0) return

    nodes.push(...emitNodes(region, regionIndex, polygons, scales, upper.yAxis))
  })

  return nodes
}
