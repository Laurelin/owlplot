import {
  splitIntoContiguousSegments,
  type CurveBuilder,
  type ScreenPoint,
} from './types'
import { buildLinearSubpaths } from './linear'

function hasStrictlyIncreasingX(points: readonly ScreenPoint[]): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i + 1]!.x <= points[i]!.x) return false
  }
  return true
}

function buildSimpleSubpath(
  points: readonly ScreenPoint[]
): string | undefined {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
  if (points.length === 2 || !hasStrictlyIncreasingX(points)) {
    return buildLinearSubpaths(points).join(' ')
  }
  return undefined
}

function calculateSecantSlopes(points: readonly ScreenPoint[]): number[] {
  const slopes: number[] = new Array(points.length - 1)
  for (let i = 0; i < slopes.length; i++) {
    const dx = points[i + 1]!.x - points[i]!.x
    slopes[i] = (points[i + 1]!.y - points[i]!.y) / dx
  }
  return slopes
}

function calculateTangents(slopes: readonly number[]): number[] {
  const tangents: number[] = new Array(slopes.length + 1)
  tangents[0] = slopes[0]!
  tangents[tangents.length - 1] = slopes[slopes.length - 1]!
  for (let i = 1; i < tangents.length - 1; i++) {
    tangents[i] = (slopes[i - 1]! + slopes[i]!) / 2
  }
  return tangents
}

function limitTangents(slopes: readonly number[], tangents: number[]): void {
  for (let i = 0; i < slopes.length; i++) {
    const slope = slopes[i]!
    if (slope === 0) {
      tangents[i] = 0
      tangents[i + 1] = 0
      continue
    }
    const a = tangents[i]! / slope
    const b = tangents[i + 1]! / slope
    const h = Math.hypot(a, b)
    if (h > 3) {
      const t = 3 / h
      tangents[i] = t * a * slope
      tangents[i + 1] = t * b * slope
    }
  }
}

function buildCubicCommand(
  p0: ScreenPoint,
  p1: ScreenPoint,
  startTangent: number,
  endTangent: number
): string {
  const dx = p1.x - p0.x
  const c1x = p0.x + dx / 3
  const rawC1y = p0.y + (startTangent * dx) / 3
  const c2x = p1.x - dx / 3
  const rawC2y = p1.y - (endTangent * dx) / 3
  const minY = Math.min(p0.y, p1.y)
  const maxY = Math.max(p0.y, p1.y)
  const c1y = Math.min(maxY, Math.max(minY, rawC1y))
  const c2y = Math.min(maxY, Math.max(minY, rawC2y))
  return ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`
}

function buildMonotoneCurve(
  points: readonly ScreenPoint[],
  tangents: readonly number[]
): string {
  let path = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 0; i < points.length - 1; i++) {
    path += buildCubicCommand(
      points[i]!,
      points[i + 1]!,
      tangents[i]!,
      tangents[i + 1]!
    )
  }
  return path
}

function buildMonotoneSubpath(points: readonly ScreenPoint[]): string {
  const simplePath = buildSimpleSubpath(points)
  if (simplePath !== undefined) return simplePath

  const slopes = calculateSecantSlopes(points)
  const tangents = calculateTangents(slopes)
  limitTangents(slopes, tangents)
  return buildMonotoneCurve(points, tangents)
}

export const buildMonotoneXSubpaths: CurveBuilder = points => {
  const segments = splitIntoContiguousSegments(points)
  return segments.map(buildMonotoneSubpath).filter(path => path !== '')
}
