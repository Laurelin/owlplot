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

function resolveYProjector(
  scales: CartesianScales,
  series: CartesianSeries
): (value: number) => number {
  if (!('yLeft' in scales && 'yRight' in scales)) {
    return scales.y.forward.bind(scales.y)
  }
  const scale = series.yAxis === 'right' ? scales.yRight : scales.yLeft
  return scale.forward.bind(scale)
}

function projectSeriesPoints(
  series: CartesianSeries,
  scales: CartesianScales,
  projectY: (value: number) => number
): ScreenPointOrGap[] {
  return series.points.map(point => {
    if (
      point.y === null ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.x)
    ) {
      return null
    }
    return { x: scales.x.forward(point.x), y: projectY(point.y) }
  })
}

function buildStrokeNode(
  series: CartesianSeries,
  path: string,
  stroke: NonNullable<PaintStyles['stroke']>
): SceneNode {
  const isGradient = stroke.type === 'linear' || stroke.type === 'radial'
  return {
    kind: SceneNodeKind.PATH,
    id: `series:${series.id}`,
    d: path,
    style: {
      fill: TRANSPARENT_FILL,
      stroke,
      strokeWidth: isGradient ? 4 : 2,
    },
  }
}

function buildAreaFillNode(
  series: Extract<CartesianSeries, { type: 'area' }>,
  projected: ScreenPointOrGap[],
  baselineY: number,
  curve: ReturnType<typeof resolveLineCurve>,
  paint: PaintStyles,
  chartAreaFillOpacity: number | undefined
): SceneNode | undefined {
  const path = buildAreaPath({ points: projected, baselineY, curve })
  if (!path) return undefined
  const style: SceneNode['style'] = {
    fill: paint.fill ?? paint.stroke ?? DEFAULT_SOLID_CURRENT_COLOR,
    stroke: { type: 'solid', color: 'none' },
  }
  const opacity = resolveAreaFillOpacity(
    series.fillOpacity,
    chartAreaFillOpacity
  )
  if (shouldSerializeFillOpacity(opacity)) style.fillOpacity = opacity
  return {
    kind: SceneNodeKind.PATH,
    id: `series-fill:${series.id}`,
    d: path,
    style,
  }
}

function resolveGradientPointFill(
  stroke: Extract<
    NonNullable<PaintStyles['stroke']>,
    { type: 'linear' | 'radial' }
  >
): PaintStyles['fill'] {
  try {
    const firstStop = normalizeGradientPaint(stroke).stops[0]!
    return { type: 'solid', color: firstStop.color }
  } catch {
    return undefined
  }
}

function resolvePointFill(
  paint: PaintStyles
): NonNullable<PaintStyles['fill']> {
  if (paint.fill) return paint.fill
  return paint.stroke
    ? resolveStrokePointFill(paint.stroke)
    : DEFAULT_SOLID_CURRENT_COLOR
}

function resolveStrokePointFill(
  stroke: NonNullable<PaintStyles['stroke']>
): NonNullable<PaintStyles['fill']> {
  switch (stroke.type) {
    case 'solid':
      return stroke
    case 'linear':
    case 'radial':
      return resolveGradientPointFill(stroke) ?? DEFAULT_SOLID_CURRENT_COLOR
    default:
      return DEFAULT_SOLID_CURRENT_COLOR
  }
}

function buildPointNodes(
  series: CartesianSeries,
  paint: PaintStyles,
  defaultPointConfig: PointConfig | undefined
): SceneNode[] {
  const pointConfig = resolvePointConfig(series.point, defaultPointConfig)
  const fill = resolvePointFill(paint)
  return series.points.flatMap((point, index) => {
    if (
      point.y === null ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.x)
    ) {
      return []
    }
    return [
      {
        kind: SceneNodeKind.POINT,
        id: `point:${series.id}:${index}`,
        seriesId: series.id,
        x: point.x,
        y: point.y,
        point: { shape: pointConfig.shape, size: pointConfig.size },
        style: { fill },
        metadata: {
          tooltip: createSceneTooltip(
            TooltipKind.POINT,
            [{ seriesId: series.id, x: point.x, y: point.y }],
            {}
          ),
        },
      },
    ]
  })
}

function buildAreaSeriesNodes(
  series: Extract<CartesianSeries, { type: 'area' }>,
  projected: ScreenPointOrGap[],
  strokePath: string,
  projectY: (value: number) => number,
  paint: PaintStyles,
  chartAreaFillOpacity: number | undefined
): SceneNode[] {
  const curve = resolveLineCurve(series.curve)
  const fill = buildAreaFillNode(
    series,
    projected,
    projectY(resolveAreaBaselineDomain(series)),
    curve,
    paint,
    chartAreaFillOpacity
  )
  const stroke = paint.stroke ?? DEFAULT_SOLID_CURRENT_COLOR
  const nodes = fill ? [fill] : []
  if (strokePath && !isPaintNone(stroke)) {
    nodes.push(buildStrokeNode(series, strokePath, stroke))
  }
  return nodes
}

function buildOneSeriesNodes(
  series: CartesianSeries,
  scales: CartesianScales,
  pointsMode: { type: 'hidden' } | { type: 'visible'; default?: PointConfig },
  chartAreaFillOpacity: number | undefined
): SceneNode[] {
  const paint = resolveSeriesPaint(series, pointsMode.type === 'visible')
  const projectY = resolveYProjector(scales, series)
  const curve = resolveLineCurve(series.curve)
  const projected = projectSeriesPoints(series, scales, projectY)
  const strokePath = buildCurvePath(projected, curve)
  const stroke = paint.stroke ?? DEFAULT_SOLID_CURRENT_COLOR
  const nodes =
    series.type === 'area'
      ? buildAreaSeriesNodes(
          series,
          projected,
          strokePath,
          projectY,
          paint,
          chartAreaFillOpacity
        )
      : [buildStrokeNode(series, strokePath, stroke)]
  if (pointsMode.type === 'visible') {
    nodes.push(...buildPointNodes(series, paint, pointsMode.default))
  }
  return nodes
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
  const pointsMode = pointsEnabled
    ? ({ type: 'visible', default: defaultPointConfig } as const)
    : ({ type: 'hidden' } as const)
  return seriesList.flatMap(series =>
    buildOneSeriesNodes(series, scales, pointsMode, chartAreaFillOpacity)
  )
}
