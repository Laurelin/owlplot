import type { LineChartConfig } from '../../config/types'
import type { ChartEnvironment } from '../../env/types'
import type { SceneNode } from '../../scene/types'
import { SceneNodeKind } from '../../scene/types'
import { mergePadding } from '../../config/helpers'
import {
  computeCartesianLayout,
  type CartesianScales,
} from '../cartesian2d/layout'
import type { ChartSize } from '../types'
import { axisToSceneNodes } from './axisNodes'
import { buildAxisConfigs } from './axisConfig'
import { buildSeriesNodes, resolveSeriesPaint } from './seriesNodes'
import { buildHoverMetadata } from './hoverMetadata'
import type { ContinuousScale } from '../cartesian2d/scale'

export { axisToSceneNodes } from './axisNodes'
export type { HoverSeries } from './hoverMetadata'

/** Epsilon for "value is zero" and "domain includes zero" checks. */
const ZERO_EPSILON = 1e-10

function resolveYScale(
  scales: CartesianScales,
  axis: 'left' | 'right' | undefined
): ContinuousScale {
  if ('yLeft' in scales && 'yRight' in scales) {
    return axis === 'right' ? scales.yRight : scales.yLeft
  }
  return scales.y
}

function buildBandNodes(
  config: LineChartConfig,
  scales: CartesianScales,
  plotRect: { x: number; y: number; width: number; height: number }
): SceneNode[] {
  const bands = config.options?.bands
  if (bands == null || bands.length === 0) return []

  const clipTop = plotRect.y
  const clipBottom = plotRect.y + plotRect.height
  const nodes: SceneNode[] = []

  bands.forEach((band, index) => {
    let yMin = band.yMin
    let yMax = band.yMax
    if (yMin > yMax) {
      const temp = yMin
      yMin = yMax
      yMax = temp
    }

    const yScale = resolveYScale(scales, band.yAxis)
    const y1 = yScale.forward(yMin)
    const y2 = yScale.forward(yMax)

    const top = Math.min(y1, y2)
    const bottom = Math.max(y1, y2)
    const clampedTop = Math.max(clipTop, Math.min(clipBottom, top))
    const clampedBottom = Math.max(clipTop, Math.min(clipBottom, bottom))
    const height = clampedBottom - clampedTop
    if (height <= 0) return

    nodes.push({
      kind: SceneNodeKind.RECT,
      id: `band:${index}`,
      x: plotRect.x,
      y: clampedTop,
      width: plotRect.width,
      height,
      style: {
        fill: band.fill,
        opacity: band.opacity,
        stroke: { type: 'solid', color: 'none' },
      },
    })
  })

  return nodes
}

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
    xScale: config.options?.xScale,
    yScale: config.options?.yScale,
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

  const showOriginTicks = config.options?.showOriginTicks ?? false
  const shouldHideOriginTicks = !showOriginTicks
  const xMinIsZero = Math.abs(xDomain[0]) <= ZERO_EPSILON
  const xMaxIsZero = Math.abs(xDomain[1]) <= ZERO_EPSILON
  const leftDomain = yDomainLeft ?? yDomain
  const rightDomain = yDomainRight ?? yDomain
  const yLeftMinIsZero =
    axes.y !== undefined && Math.abs(leftDomain[0]) <= ZERO_EPSILON
  const yRightMinIsZero =
    axes.yRight !== undefined && Math.abs(rightDomain[0]) <= ZERO_EPSILON
  const hideBottomTickAtOrigin =
    shouldHideOriginTicks &&
    ((xMinIsZero && yLeftMinIsZero) || (xMaxIsZero && yRightMinIsZero))
  const hideLeftTickAtOrigin =
    shouldHideOriginTicks && xMinIsZero && yLeftMinIsZero
  const hideRightTickAtOrigin =
    shouldHideOriginTicks && xMaxIsZero && yRightMinIsZero

  children.push(...buildBandNodes(config, scales, plotRect))

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

  children.push(
    ...axisToSceneNodes(
      axes.x,
      plotRect,
      config.options?.axisTickFont,
      config.options?.axisLabelFont,
      hideBottomTickAtOrigin,
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
        hideLeftTickAtOrigin,
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
        hideRightTickAtOrigin,
        rightAxisConfig
      )
    )
  }

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
