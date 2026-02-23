import type { LineCurve } from '../../config/types'
import { buildCurvePath } from '../line/curves'
import {
  splitIntoContiguousSegments,
  type ScreenPointOrGap,
} from '../line/curves/types'

type ScreenPoint = { x: number; y: number }

export type BuildAreaPathInput = {
  points: readonly ScreenPointOrGap[]
  baselineY: number
  curve: LineCurve
}

function withLeadingLineCommand(path: string): string {
  return path.replace(
    /^M\s+([-\de.]+)\s+([-\de.]+)/,
    (_m, x: string, y: string) => `L ${x} ${y}`
  )
}

export function buildAreaPath(input: BuildAreaPathInput): string {
  const { points, baselineY, curve } = input
  const segments = splitIntoContiguousSegments(points)
  if (segments.length === 0) return ''

  return segments
    .map(segment => {
      const topPath = buildCurvePath(segment, curve)
      if (!topPath) return ''

      const bottomPoints: ScreenPoint[] = [...segment]
        .reverse()
        .map(point => ({ x: point.x, y: baselineY }))
      const bottomPath = buildCurvePath(bottomPoints, curve)
      const joinedBottom = withLeadingLineCommand(bottomPath)
      return `${topPath} ${joinedBottom} Z`
    })
    .filter(path => path !== '')
    .join(' ')
}
