export type ScreenPoint = {
  x: number
  y: number
}

export type ScreenPointOrGap = ScreenPoint | null

/** A curve builder can emit multiple SVG subpaths (for null/invalid gaps). */
export type CurveSubpaths = readonly string[]

export type CurveBuilder = (
  points: readonly ScreenPointOrGap[]
) => CurveSubpaths

export function splitIntoContiguousSegments(
  points: readonly ScreenPointOrGap[]
): ScreenPoint[][] {
  const segments: ScreenPoint[][] = []
  let current: ScreenPoint[] = []
  for (const pt of points) {
    if (pt === null) {
      if (current.length > 0) {
        segments.push(current)
        current = []
      }
      continue
    }
    current.push(pt)
  }
  if (current.length > 0) {
    segments.push(current)
  }
  return segments
}
