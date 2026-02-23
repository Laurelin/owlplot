import type { LineChartConfig } from '../../config/types'
import type { ChartEnvironment } from '../../env/types'
import type { SceneNode } from '../../scene/types'
import { SceneNodeKind } from '../../scene/types'
import { mergePadding } from '../../config/helpers'
import { computeCartesianLayout } from '../cartesian2d/layout'
import type { ChartSize } from '../types'
import { axisToSceneNodes } from './axisNodes'
import { buildAxisConfigs } from './axisConfig'
import { buildSeriesNodes, resolveSeriesPaint } from './seriesNodes'
import { buildHoverMetadata } from './hoverMetadata'

export { axisToSceneNodes } from './axisNodes'
export type { HoverSeries } from './hoverMetadata'

/** Epsilon for "value is zero" and "domain includes zero" checks. */
const ZERO_EPSILON = 1e-10

/**
 * `scene` orchestrates line chart computation.
 * Inputs: chart config + chart size + chart environment.
 * Output: a single root scene graph node `{ scene: SceneNode }`.
 */
export function scene(
  config: LineChartConfig,
  size: ChartSize,
  env: ChartEnvironment
): { scene: SceneNode } {
  const padding = mergePadding(config.options?.padding)
  const { bottomAxisConfig, leftAxisConfig, rightAxisConfig, layoutYAxis } =
    buildAxisConfigs(config)

  const resolvedYDomain = config.options?.yDomain ?? { mode: 'include-zero' }
  const {
    plotRect,
    scales,
    axes,
    xDomain,
    yDomain,
    yDomainLeft,
    yDomainRight,
  } = computeCartesianLayout(config.series, size, env.measureText, {
    padding,
    xAxis: bottomAxisConfig,
    yAxis: layoutYAxis,
    yAxisRight: rightAxisConfig,
    yAxisRightDomain: config.options?.yAxisRight?.domain,
    yDomain: resolvedYDomain,
    enableAdaptivePadding: config.options?.enableAdaptivePadding ?? true,
    axisTickFont: config.options?.axisTickFont,
    axisLabelFont: config.options?.axisLabelFont,
    locale: config.options?.locale,
    compactThreshold: config.options?.compactThreshold,
  })

  const children: SceneNode[] = []
  children.push({
    kind: SceneNodeKind.RECT,
    id: 'background',
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    style: { fill: { type: 'solid', color: 'transparent' } },
  })

  const effectiveYDomain =
    axes.y === undefined && yDomainRight !== undefined ? yDomainRight : yDomain
  const xAxisHasZero = xDomain[0] <= ZERO_EPSILON && xDomain[1] >= -ZERO_EPSILON
  const yAxisHasZero =
    effectiveYDomain[0] <= ZERO_EPSILON && effectiveYDomain[1] >= -ZERO_EPSILON
  const originIntersection = xAxisHasZero && yAxisHasZero
  const showOriginTicks = config.options?.showOriginTicks ?? false
  const hideTickAtOrigin = originIntersection && !showOriginTicks

  children.push(
    ...axisToSceneNodes(
      axes.x,
      plotRect,
      config.options?.axisTickFont,
      config.options?.axisLabelFont,
      hideTickAtOrigin,
      bottomAxisConfig
    )
  )
  if (axes.y !== undefined) {
    children.push(
      ...axisToSceneNodes(
        axes.y,
        plotRect,
        config.options?.axisTickFont,
        config.options?.axisLabelFont,
        hideTickAtOrigin,
        leftAxisConfig
      )
    )
  }
  if (axes.yRight) {
    children.push(
      ...axisToSceneNodes(
        axes.yRight,
        plotRect,
        config.options?.axisTickFont,
        config.options?.axisLabelFont,
        hideTickAtOrigin,
        rightAxisConfig
      )
    )
  }

  const pointsEnabled = config.options?.showPoints ?? false
  const chartAreaFillOpacity = config.options?.area?.fillOpacity
  children.push(
    ...buildSeriesNodes(
      config.series,
      scales,
      pointsEnabled,
      chartAreaFillOpacity,
      config.options?.point
    )
  )

  const legendEntries = config.series.map((series, index) => {
    const paint = resolveSeriesPaint(series, pointsEnabled)
    const swatchPaint =
      series.type === 'area'
        ? (paint.fill ??
          paint.stroke ?? { type: 'solid', color: 'currentColor' as const })
        : (paint.stroke ??
          paint.fill ?? { type: 'solid', color: 'currentColor' as const })
    return {
      seriesId: series.id,
      label: series.id,
      paint: swatchPaint,
      order: index,
    }
  })

  const hover = buildHoverMetadata(
    config.series,
    scales,
    plotRect,
    xDomain,
    yDomain,
    yDomainLeft,
    yDomainRight
  )

  return {
    scene: {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children,
      metadata: { hover, legend: { entries: legendEntries } },
    },
  }
}
