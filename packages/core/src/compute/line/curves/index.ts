import type { LineCurve } from '../../../config/types'
import type { ScreenPointOrGap } from './types'
import { buildLinearSubpaths } from './linear'
import { buildMonotoneXSubpaths } from './monotoneX'
import { buildCatmullRomSubpaths } from './catmullRom'

const DEFAULT_LINEAR_CURVE: LineCurve = { type: 'linear' }

export function resolveLineCurve(
  seriesCurve: LineCurve | undefined,
  chartCurve: LineCurve | undefined
): LineCurve {
  return seriesCurve ?? chartCurve ?? DEFAULT_LINEAR_CURVE
}

export function buildCurvePath(
  points: readonly ScreenPointOrGap[],
  curve: LineCurve
): string {
  const subpaths =
    curve.type === 'monotoneX'
      ? buildMonotoneXSubpaths(points)
      : curve.type === 'catmullRom'
        ? buildCatmullRomSubpaths(points, curve.tension)
        : buildLinearSubpaths(points)
  return subpaths.join('')
}
