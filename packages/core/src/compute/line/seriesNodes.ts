import { resolvePointConfig } from '../../config/helpers'
import type { LineSeries, PointConfig } from '../../config/types'
import {
  createSceneTooltip,
  SceneNodeKind,
  TooltipKind,
  type SceneNode,
} from '../../scene/types'
import {
  DEFAULT_SOLID_CURRENT_COLOR,
  derivePaintStylesFromColor,
  normalizeGradientPaint,
  TRANSPARENT_FILL,
  type PaintStyles,
} from '../../paint/helpers'
import { buildCurvePath, resolveLineCurve } from './curves'
import type { ScreenPointOrGap } from './curves/types'

function resolveSeriesPaint(
  series: LineSeries,
  pointsEnabled: boolean
): PaintStyles {
  const basePaint = series.color
    ? derivePaintStylesFromColor(series.color, { enableGradients: false })
    : { stroke: DEFAULT_SOLID_CURRENT_COLOR }

  if (pointsEnabled && !basePaint.fill) {
    basePaint.fill = DEFAULT_SOLID_CURRENT_COLOR
  }

  const finalPaint = series.paint
    ? { ...basePaint, ...series.paint }
    : basePaint
  return finalPaint
}

export function buildSeriesNodes(
  seriesList: LineSeries[],
  scales: {
    x: (value: number) => number
    y: (value: number) => number
    yLeft?: (value: number) => number
    yRight?: (value: number) => number
  },
  pointsEnabled: boolean,
  defaultPointConfig: PointConfig | undefined
): SceneNode[] {
  const isDualScale = scales.yLeft !== undefined && scales.yRight !== undefined
  const getYScale = (series: LineSeries): ((v: number) => number) =>
    isDualScale && series.yAxis === 'right' ? scales.yRight! : scales.y

  const children: SceneNode[] = []

  for (const series of seriesList) {
    const paint = resolveSeriesPaint(series, pointsEnabled)
    const yScaleForSeries = getYScale(series)
    const curve = resolveLineCurve(series.curve)
    const projected: ScreenPointOrGap[] = series.points.map(pt =>
      pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x)
        ? null
        : { x: scales.x(pt.x), y: yScaleForSeries(pt.y) }
    )

    const strokePaint = paint.stroke ?? DEFAULT_SOLID_CURRENT_COLOR
    const isGradient =
      strokePaint.type === 'linear' || strokePaint.type === 'radial'
    children.push({
      kind: SceneNodeKind.PATH,
      id: `series:${series.id}`,
      d: buildCurvePath(projected, curve),
      style: {
        fill: TRANSPARENT_FILL,
        stroke: strokePaint,
        strokeWidth: isGradient ? 4 : 2,
      },
    })

    if (pointsEnabled) {
      const pointConfig = resolvePointConfig(series.point, defaultPointConfig)
      series.points.forEach((pt, index) => {
        if (pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x)) {
          return
        }
        let pointFill = paint.fill
        if (!pointFill && paint.stroke) {
          if (paint.stroke.type === 'solid') {
            pointFill = paint.stroke
          } else if (
            paint.stroke.type === 'linear' ||
            paint.stroke.type === 'radial'
          ) {
            try {
              const normalized = normalizeGradientPaint(paint.stroke)
              const firstStop = normalized.stops[0]
              if (firstStop) {
                pointFill = { type: 'solid', color: firstStop.color }
              }
            } catch {
              // fall through
            }
          }
        }
        pointFill = pointFill ?? DEFAULT_SOLID_CURRENT_COLOR

        children.push({
          kind: SceneNodeKind.POINT,
          id: `point:${series.id}:${index}`,
          seriesId: series.id,
          x: pt.x,
          y: pt.y,
          point: { shape: pointConfig.shape, size: pointConfig.size },
          style: { fill: pointFill },
          metadata: {
            tooltip: createSceneTooltip(
              TooltipKind.POINT,
              [{ seriesId: series.id, x: pt.x, y: pt.y }],
              {}
            ),
          },
        })
      })
    }
  }

  return children
}
