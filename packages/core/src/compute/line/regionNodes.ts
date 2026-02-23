import type {
  CartesianSeries,
  RegionBetweenSeriesConfig,
} from '../../config/types'
import type { CartesianScales } from '../cartesian2d/layout'
import { SceneNodeKind, type SceneNode } from '../../scene/types'
import type { ContinuousScale } from '../cartesian2d/scale'

type DomainPoint = { x: number; y: number }

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

function toStrictlyIncreasingPoints(
  points: CartesianSeries['points']
): DomainPoint[] | null {
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
    if (normalized[i]!.x <= normalized[i - 1]!.x) {
      return null
    }
  }
  return normalized
}

function interpolateSeriesAtX(
  points: DomainPoint[],
  xValues: number[]
): number[] | null {
  if (points.length < 2) return null

  const yValues: number[] = []
  let cursor = 0
  const lastIndex = points.length - 1

  for (const x of xValues) {
    while (cursor + 1 < points.length && x > points[cursor + 1]!.x + EPSILON) {
      cursor += 1
    }

    if (cursor >= lastIndex) {
      const atLast = Math.abs(x - points[lastIndex]!.x) <= EPSILON
      if (!atLast) return null
      yValues.push(points[lastIndex]!.y)
      continue
    }

    const start = points[cursor]!
    const end = points[cursor + 1]!

    if (x < start.x - EPSILON || x > end.x + EPSILON) {
      return null
    }

    if (Math.abs(x - start.x) <= EPSILON) {
      yValues.push(start.y)
      continue
    }
    if (Math.abs(x - end.x) <= EPSILON) {
      yValues.push(end.y)
      continue
    }

    const t = (x - start.x) / (end.x - start.x)
    yValues.push(start.y + (end.y - start.y) * t)
  }

  return yValues
}

function buildPolygonPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 3) return ''
  const first = points[0]!
  const rest = points
    .slice(1)
    .map(point => `L ${point.x} ${point.y}`)
    .join(' ')
  return `M ${first.x} ${first.y}${rest.length > 0 ? ` ${rest}` : ''} Z`
}

export function buildRegionNodes(
  regionConfigs: RegionBetweenSeriesConfig[] | undefined,
  seriesList: CartesianSeries[],
  scales: CartesianScales
): SceneNode[] {
  if (regionConfigs == null || regionConfigs.length === 0) return []

  const byId = new Map(seriesList.map(series => [series.id, series]))
  const nodes: SceneNode[] = []

  regionConfigs.forEach((region, index) => {
    const upperSeries = byId.get(region.upperSeriesId)
    const lowerSeries = byId.get(region.lowerSeriesId)
    if (!upperSeries || !lowerSeries) return

    const upperAxis = resolveSeriesYAxis(upperSeries)
    const lowerAxis = resolveSeriesYAxis(lowerSeries)
    if (upperAxis !== lowerAxis) return

    const upperPoints = toStrictlyIncreasingPoints(upperSeries.points)
    const lowerPoints = toStrictlyIncreasingPoints(lowerSeries.points)
    if (!upperPoints || !lowerPoints) return

    const overlapMin = Math.max(upperPoints[0]!.x, lowerPoints[0]!.x)
    const overlapMax = Math.min(
      upperPoints[upperPoints.length - 1]!.x,
      lowerPoints[lowerPoints.length - 1]!.x
    )
    if (!(overlapMax > overlapMin)) return

    const xValues = Array.from(
      new Set(
        [...upperPoints, ...lowerPoints]
          .map(point => point.x)
          .filter(x => x >= overlapMin - EPSILON && x <= overlapMax + EPSILON)
      )
    ).sort((a, b) => a - b)
    if (xValues.length < 2) return

    const upperYValues = interpolateSeriesAtX(upperPoints, xValues)
    const lowerYValues = interpolateSeriesAtX(lowerPoints, xValues)
    if (!upperYValues || !lowerYValues) return

    const upperAligned: DomainPoint[] = [{ x: xValues[0]!, y: upperYValues[0]! }]
    const lowerAligned: DomainPoint[] = [{ x: xValues[0]!, y: lowerYValues[0]! }]

    for (let i = 1; i < xValues.length; i += 1) {
      const prevDiff = upperYValues[i - 1]! - lowerYValues[i - 1]!
      const currentDiff = upperYValues[i]! - lowerYValues[i]!
      const hasCrossing =
        (prevDiff < 0 && currentDiff > 0) || (prevDiff > 0 && currentDiff < 0)

      if (hasCrossing) {
        const denominator = prevDiff - currentDiff
        if (Math.abs(denominator) > EPSILON) {
          const t = prevDiff / denominator
          if (t > EPSILON && t < 1 - EPSILON) {
            const prevX = xValues[i - 1]!
            const currentX = xValues[i]!
            const intersectionX = prevX + (currentX - prevX) * t
            const upperIntersectionY =
              upperYValues[i - 1]! + (upperYValues[i]! - upperYValues[i - 1]!) * t
            const lowerIntersectionY =
              lowerYValues[i - 1]! + (lowerYValues[i]! - lowerYValues[i - 1]!) * t
            upperAligned.push({ x: intersectionX, y: upperIntersectionY })
            lowerAligned.push({ x: intersectionX, y: lowerIntersectionY })
          }
        }
      }

      upperAligned.push({ x: xValues[i]!, y: upperYValues[i]! })
      lowerAligned.push({ x: xValues[i]!, y: lowerYValues[i]! })
    }

    const polygonDomainPoints = [
      ...upperAligned,
      ...lowerAligned.slice().reverse(),
    ]
    if (polygonDomainPoints.length < 3) return

    const yScale = resolveYScale(scales, upperAxis)
    const projectedPoints = polygonDomainPoints.map(point => ({
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

    nodes.push({
      kind: SceneNodeKind.PATH,
      id: `__region__:${index}`,
      d,
      style: {
        fill: region.fill,
        opacity: region.opacity,
        stroke: { type: 'solid', color: 'none' },
      },
      metadata: {
        role: 'region',
        upperSeriesId: region.upperSeriesId,
        lowerSeriesId: region.lowerSeriesId,
      },
    })
  })

  return nodes
}
