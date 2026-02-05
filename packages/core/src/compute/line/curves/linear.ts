import {
  splitIntoContiguousSegments,
  type CurveBuilder,
  type CurveSubpaths,
} from './types'

function buildLinearSubpath(
  points: readonly { x: number; y: number }[]
): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const p = points[0]!
    return `M ${p.x} ${p.y}`
  }
  const [first, ...rest] = points
  let d = `M ${first!.x} ${first!.y}`
  for (const pt of rest) {
    d += ` L ${pt.x} ${pt.y}`
  }
  return d
}

export const buildLinearSubpaths: CurveBuilder = points => {
  const segments = splitIntoContiguousSegments(points)
  const subpaths: CurveSubpaths = segments
    .map(buildLinearSubpath)
    .filter(path => path !== '')
  return subpaths
}
