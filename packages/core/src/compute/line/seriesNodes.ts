import { resolvePointConfig } from '../../config/helpers'
import type { CartesianSeries, PointConfig } from '../../config/types'
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
import { buildAreaPath } from '../cartesian2d/buildAreaPath'
import type { CartesianScales } from '../cartesian2d/layout'
import {
  resolveAreaFillOpacity,
  shouldSerializeFillOpacity,
} from './areaOpacity'

function resolveAreaBaselineDomain(series: CartesianSeries): number {
  const baseline = series.type === 'area' ? (series.baseline ?? 'zero') : 'zero'
  return baseline === 'zero' ? 0 : baseline
}

function isPaintNone(paint: PaintStyles['stroke'] | undefined): boolean {
  return paint?.type === 'solid' && paint.color === 'none'
}

export function resolveSeriesPaint(
  series: CartesianSeries,
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
  seriesList: CartesianSeries[],
  scales: CartesianScales,
  pointsEnabled: boolean,
  chartAreaFillOpacity: number | undefined,
  defaultPointConfig: PointConfig | undefined
): SceneNode[] {
  const isDualScale = 'yLeft' in scales && 'yRight' in scales
  const getYScale = (series: CartesianSeries): ((v: number) => number) =>
    isDualScale && series.yAxis === 'right'
      ? scales.yRight.forward.bind(scales.yRight)
      : isDualScale
        ? scales.yLeft.forward.bind(scales.yLeft)
        : scales.y.forward.bind(scales.y)

  const children: SceneNode[] = []

  for (const series of seriesList) {
    const paint = resolveSeriesPaint(series, pointsEnabled)
    const yScaleForSeries = getYScale(series)
    const curve = resolveLineCurve(series.curve)
    const projected: ScreenPointOrGap[] = series.points.map(pt =>
      pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x)
        ? null
        : { x: scales.x.forward(pt.x), y: yScaleForSeries(pt.y) }
    )

    const strokePath = buildCurvePath(projected, curve)
    const strokePaint = paint.stroke ?? DEFAULT_SOLID_CURRENT_COLOR
    const isGradient =
      strokePaint.type === 'linear' || strokePaint.type === 'radial'

    if (series.type === 'area') {
      const fillPaint =
        paint.fill ?? paint.stroke ?? DEFAULT_SOLID_CURRENT_COLOR
      const baselineY = yScaleForSeries(resolveAreaBaselineDomain(series))
      const fillPath = buildAreaPath({ points: projected, baselineY, curve })
      const resolvedFillOpacity = resolveAreaFillOpacity(
        series.fillOpacity,
        chartAreaFillOpacity
      )
      if (fillPath) {
        const style: SceneNode['style'] = {
          fill: fillPaint,
          stroke: { type: 'solid', color: 'none' },
        }
        if (shouldSerializeFillOpacity(resolvedFillOpacity)) {
          style.fillOpacity = resolvedFillOpacity
        }
        children.push({
          kind: SceneNodeKind.PATH,
          id: `series-fill:${series.id}`,
          d: fillPath,
          style,
        })
      }
      if (strokePath && !isPaintNone(strokePaint)) {
        children.push({
          kind: SceneNodeKind.PATH,
          id: `series:${series.id}`,
          d: strokePath,
          style: {
            fill: TRANSPARENT_FILL,
            stroke: strokePaint,
            strokeWidth: isGradient ? 4 : 2,
          },
        })
      }
    } else {
      children.push({
        kind: SceneNodeKind.PATH,
        id: `series:${series.id}`,
        d: strokePath,
        style: {
          fill: TRANSPARENT_FILL,
          stroke: strokePaint,
          strokeWidth: isGradient ? 4 : 2,
        },
      })
    }

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
