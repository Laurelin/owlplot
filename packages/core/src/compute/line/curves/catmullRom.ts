import { splitIntoContiguousSegments, type ScreenPoint } from './types'
import { buildLinearSubpaths } from './linear'

const DEFAULT_CATMULL_ROM_TENSION = 0.5

function buildSimpleSubpath(
  points: readonly ScreenPoint[]
): string | undefined {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
  if (points.length === 2) return buildLinearSubpaths(points).join(' ')
  return undefined
}

function buildCatmullRomCommand(
  p0: ScreenPoint,
  p1: ScreenPoint,
  p2: ScreenPoint,
  p3: ScreenPoint,
  tension: number
): string {
  const c1x = p1.x + ((p2.x - p0.x) * tension) / 3
  const c1y = p1.y + ((p2.y - p0.y) * tension) / 3
  const c2x = p2.x - ((p3.x - p1.x) * tension) / 3
  const c2y = p2.y - ((p3.y - p1.y) * tension) / 3
  return ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
}

function buildCatmullRomCurve(
  points: readonly ScreenPoint[],
  tension: number
): string {
  let path = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[Math.min(points.length - 1, i + 2)]!
    path += buildCatmullRomCommand(p0, p1, p2, p3, tension)
  }
  return path
}

function buildCatmullRomSubpath(
  points: readonly ScreenPoint[],
  tension: number
): string {
  const simplePath = buildSimpleSubpath(points)
  return simplePath ?? buildCatmullRomCurve(points, tension)
}

export function buildCatmullRomSubpaths(
  points: readonly (ScreenPoint | null)[],
  tension: number = DEFAULT_CATMULL_ROM_TENSION
) {
  const segments = splitIntoContiguousSegments(points)
  return segments
    .map(segment => buildCatmullRomSubpath(segment, tension))
    .filter(path => path !== '')
}
