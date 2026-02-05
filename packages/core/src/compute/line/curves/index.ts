import type { LineCurve } from '../../../config/types'
import type { ScreenPointOrGap } from './types'
import { buildLinearSubpaths } from './linear'
import { buildMonotoneXSubpaths } from './monotoneX'
import { buildCatmullRomSubpaths } from './catmullRom'

const DEFAULT_CURVE: LineCurve = { type: 'monotoneX' }

export function resolveLineCurve(
  seriesCurve: LineCurve | undefined
): LineCurve {
  return seriesCurve ?? DEFAULT_CURVE
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
