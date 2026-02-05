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

function buildMonotoneSubpath(points: readonly ScreenPoint[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
  if (points.length === 2 || !hasStrictlyIncreasingX(points)) {
    return buildLinearSubpaths(points).join(' ')
  }

  const n = points.length
  const d: number[] = new Array(n - 1)
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1]!.x - points[i]!.x
    d[i] = (points[i + 1]!.y - points[i]!.y) / dx
  }

  const m: number[] = new Array(n)
  m[0] = d[0]!
  m[n - 1] = d[n - 2]!
  for (let i = 1; i < n - 1; i++) {
    m[i] = (d[i - 1]! + d[i]!) / 2
  }

  // Fritsch-Carlson slope limiting to preserve monotonicity.
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i]! / d[i]!
    const b = m[i + 1]! / d[i]!
    const h = Math.hypot(a, b)
    if (h > 3) {
      const t = 3 / h
      m[i] = t * a * d[i]!
      m[i + 1] = t * b * d[i]!
    }
  }

  let path = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!
    const p1 = points[i + 1]!
    const dx = p1.x - p0.x
    const c1x = p0.x + dx / 3
    const rawC1y = p0.y + (m[i]! * dx) / 3
    const c2x = p1.x - dx / 3
    const rawC2y = p1.y - (m[i + 1]! * dx) / 3
    const minY = Math.min(p0.y, p1.y)
    const maxY = Math.max(p0.y, p1.y)
    const c1y = Math.min(maxY, Math.max(minY, rawC1y))
    const c2y = Math.min(maxY, Math.max(minY, rawC2y))
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`
  }
  return path
}

export const buildMonotoneXSubpaths: CurveBuilder = points => {
  const segments = splitIntoContiguousSegments(points)
  return segments.map(buildMonotoneSubpath).filter(path => path !== '')
}
