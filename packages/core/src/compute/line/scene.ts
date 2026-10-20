import type { LineChartConfig } from '../../config/types'
import type { ChartEnvironment } from '../../env/types'
import type { SceneNode } from '../../scene/types'
import { SceneNodeKind } from '../../scene/types'
import { mergePadding } from '../../config/helpers'
import {
  computeCartesianLayout,
  type CartesianLayoutResult,
  type CartesianScales,
} from '../cartesian2d/layout'
import type { ChartSize } from '../types'
import { axisToSceneNodes } from './axisNodes'
import { buildAxisConfigs } from './axisConfig'
import { buildSeriesNodes, resolveSeriesPaint } from './seriesNodes'
import { buildRegionNodes } from './regionNodes'
import { buildHoverMetadata } from './hoverMetadata'
import type { ContinuousScale } from '../cartesian2d/scale'
import { TextAnchor } from '../../text/types'
import type { AnyPaint } from '../../paint/types'

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
      id: `__band__:${index}`,
      x: plotRect.x,
      y: clampedTop,
      width: plotRect.width,
      height,
      style: {
        fill: band.fill,
        opacity: band.opacity,
        stroke: { type: 'solid', color: 'none' },
      },
      metadata: { role: 'band' },
    })
  })

  return nodes
}

function buildAnnotationNodes(
  config: LineChartConfig,
  scales: CartesianScales,
  plotRect: { x: number; y: number; width: number; height: number }
): SceneNode[] {
  const annotations = config.options?.annotations
  if (annotations == null || annotations.length === 0) return []

  const clipTop = plotRect.y
  const clipBottom = plotRect.y + plotRect.height
  const clipLeft = plotRect.x
  const clipRight = plotRect.x + plotRect.width

  return annotations.flatMap((annotation, index) => {
    if (!Number.isFinite(annotation.y)) return []
    if (typeof annotation.x !== 'number' || !Number.isFinite(annotation.x)) {
      return []
    }

    const yScale = resolveYScale(scales, annotation.yAxis)
    const projectedX = scales.x.forward(annotation.x)
    const projectedY = yScale.forward(annotation.y)

    // Skip out-of-plot annotations in v1. No clamping.
    if (
      projectedX < clipLeft ||
      projectedX > clipRight ||
      projectedY < clipTop ||
      projectedY > clipBottom
    ) {
      return []
    }

    const textAnchor =
      annotation.align === 'left'
        ? TextAnchor.START
        : annotation.align === 'right'
          ? TextAnchor.END
          : TextAnchor.MIDDLE

    return [
      {
        kind: SceneNodeKind.TEXT,
        id: `__annotation__:${index}`,
        x: projectedX,
        y: projectedY,
        text: annotation.text,
        textAnchor,
        style: {
          fill: annotation.style?.fill,
          opacity: annotation.style?.opacity,
          fontSizePx: annotation.style?.fontSizePx,
          fontWeight: annotation.style?.fontWeight,
          fontFamily: annotation.style?.fontFamily,
        },
        metadata: { role: 'annotation' },
      } satisfies SceneNode,
    ]
  })
}

type LineOptions = NonNullable<LineChartConfig['options']>

function resolveRightDomain(
  options: LineOptions
): [number, number] | undefined {
  return options.yAxisRight?.domain
}

function resolveYDomain(options: LineOptions) {
  return options.yDomain ?? { mode: 'include-zero' as const }
}

function resolveAdaptivePadding(options: LineOptions): boolean {
  return options.enableAdaptivePadding ?? true
}

function computeLineLayout(
  config: LineChartConfig,
  seriesForCompute: LineChartConfig['series'],
  size: ChartSize,
  env: ChartEnvironment,
  axes: ReturnType<typeof buildAxisConfigs>
): CartesianLayoutResult {
  const options = config.options ?? {}
  return computeCartesianLayout(seriesForCompute, size, env.measureText, {
    padding: mergePadding(options.padding),
    xAxis: axes.bottomAxisConfig,
    yAxis: axes.layoutYAxis,
    yAxisRight: axes.rightAxisConfig,
    yAxisRightDomain: resolveRightDomain(options),
    yDomain: resolveYDomain(options),
    enableAdaptivePadding: resolveAdaptivePadding(options),
    axisTickFont: options.axisTickFont,
    axisLabelFont: options.axisLabelFont,
    locale: options.locale,
    compactThreshold: options.compactThreshold,
    xScale: options.xScale,
    yScale: options.yScale,
  })
}

type OriginTickVisibility = {
  bottom: boolean
  left: boolean
  right: boolean
}

function isDomainEdgeZero(domain: [number, number], edge: 0 | 1): boolean {
  return Math.abs(domain[edge]) <= ZERO_EPSILON
}

function resolveSideDomain(
  side: 'left' | 'right',
  layout: CartesianLayoutResult
): [number, number] {
  return side === 'left'
    ? (layout.yDomainLeft ?? layout.yDomain)
    : (layout.yDomainRight ?? layout.yDomain)
}

function axisMinimumIsZero(axis: unknown, domain: [number, number]): boolean {
  return axis !== undefined && isDomainEdgeZero(domain, 0)
}

function shouldHideBottomOrigin(
  xMinIsZero: boolean,
  xMaxIsZero: boolean,
  leftMinIsZero: boolean,
  rightMinIsZero: boolean
): boolean {
  return (xMinIsZero && leftMinIsZero) || (xMaxIsZero && rightMinIsZero)
}

function resolveOriginTickVisibility(
  layout: CartesianLayoutResult,
  showOriginTicks: boolean
): OriginTickVisibility {
  if (showOriginTicks) return { bottom: false, left: false, right: false }
  const xMinIsZero = isDomainEdgeZero(layout.xDomain, 0)
  const xMaxIsZero = isDomainEdgeZero(layout.xDomain, 1)
  const leftMinIsZero = axisMinimumIsZero(
    layout.axes.y,
    resolveSideDomain('left', layout)
  )
  const rightMinIsZero = axisMinimumIsZero(
    layout.axes.yRight,
    resolveSideDomain('right', layout)
  )
  return {
    bottom: shouldHideBottomOrigin(
      xMinIsZero,
      xMaxIsZero,
      leftMinIsZero,
      rightMinIsZero
    ),
    left: xMinIsZero && leftMinIsZero,
    right: xMaxIsZero && rightMinIsZero,
  }
}

type AxisFonts = { tick?: string; label?: string }

function resolveAxisFonts(config: LineChartConfig): AxisFonts {
  return {
    tick: config.options?.axisTickFont,
    label: config.options?.axisLabelFont,
  }
}

function buildOptionalAxisNodes(
  axis: CartesianLayoutResult['axes']['y'],
  layout: CartesianLayoutResult,
  fonts: AxisFonts,
  hideOrigin: boolean,
  config: Parameters<typeof axisToSceneNodes>[5]
): SceneNode[] {
  if (!axis) return []
  return axisToSceneNodes(
    axis,
    layout.plotRect,
    fonts.tick,
    fonts.label,
    hideOrigin,
    config
  )
}

function buildAxisNodes(
  config: LineChartConfig,
  layout: CartesianLayoutResult,
  axisConfigs: ReturnType<typeof buildAxisConfigs>,
  originTicks: OriginTickVisibility
): SceneNode[] {
  const fonts = resolveAxisFonts(config)
  return [
    ...axisToSceneNodes(
      layout.axes.x,
      layout.plotRect,
      fonts.tick,
      fonts.label,
      originTicks.bottom,
      axisConfigs.bottomAxisConfig
    ),
    ...buildOptionalAxisNodes(
      layout.axes.y,
      layout,
      fonts,
      originTicks.left,
      axisConfigs.leftAxisConfig
    ),
    ...buildOptionalAxisNodes(
      layout.axes.yRight,
      layout,
      fonts,
      originTicks.right,
      axisConfigs.rightAxisConfig
    ),
  ]
}

function buildBackgroundNode(size: ChartSize): SceneNode {
  return {
    kind: SceneNodeKind.RECT,
    id: 'background',
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    style: { fill: { type: 'solid', color: 'transparent' } },
    metadata: { role: 'background' },
  }
}

function resolveLegendPaint(
  series: LineChartConfig['series'][number],
  pointsEnabled: boolean
): AnyPaint {
  const paint = resolveSeriesPaint(series, pointsEnabled)
  return series.type === 'area'
    ? selectLegendPaint(paint.fill, paint.stroke)
    : selectLegendPaint(paint.stroke, paint.fill)
}

function selectLegendPaint(
  primary: AnyPaint | undefined,
  secondary: AnyPaint | undefined
): AnyPaint {
  if (primary) return primary
  if (secondary) return secondary
  return { type: 'solid', color: 'currentColor' }
}

function buildLegendEntries(config: LineChartConfig, pointsEnabled: boolean) {
  return config.series.map((series, index) => ({
    seriesId: series.id,
    label: series.id,
    paint: resolveLegendPaint(series, pointsEnabled),
    order: index,
  }))
}

function buildLayeredChildren(
  config: LineChartConfig,
  size: ChartSize,
  seriesForCompute: LineChartConfig['series'],
  layout: CartesianLayoutResult,
  axisConfigs: ReturnType<typeof buildAxisConfigs>,
  pointsEnabled: boolean
): SceneNode[] {
  const options = config.options ?? {}
  const originTicks = resolveOriginTickVisibility(
    layout,
    options.showOriginTicks === true
  )
  const bands = buildBandNodes(config, layout.scales, layout.plotRect)
  const regions = buildRegionNodes(
    options.regions,
    options.dominanceRegions,
    seriesForCompute,
    layout.scales
  )
  const series = buildSeriesNodes(
    seriesForCompute,
    layout.scales,
    pointsEnabled,
    options.area?.fillOpacity,
    options.point
  )
  const annotations = buildAnnotationNodes(
    config,
    layout.scales,
    layout.plotRect
  )
  const axes = buildAxisNodes(config, layout, axisConfigs, originTicks)
  // Layering invariant: bands -> regions -> series -> annotations -> axes.
  return [
    buildBackgroundNode(size),
    ...bands,
    ...regions,
    ...series,
    ...annotations,
    ...axes,
  ]
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
  const hidden = new Set(config.options?.hiddenSeriesIds ?? [])
  const seriesForCompute = config.series.filter(
    series => !hidden.has(series.id)
  )
  const axisConfigs = buildAxisConfigs(config)
  const layout = computeLineLayout(
    config,
    seriesForCompute,
    size,
    env,
    axisConfigs
  )
  const pointsEnabled = config.options?.showPoints ?? false
  const children = buildLayeredChildren(
    config,
    size,
    seriesForCompute,
    layout,
    axisConfigs,
    pointsEnabled
  )

  // Bands/regions are intentionally excluded from legend generation in v1.
  // They are contextual background, not semantic series.
  // Annotations are also excluded from legend generation in v1.
  const legendEntries = buildLegendEntries(config, pointsEnabled)
  const hover = buildHoverMetadata(
    seriesForCompute,
    layout.scales,
    layout.plotRect,
    layout.xDomain,
    layout.yDomain,
    layout.yDomainLeft,
    layout.yDomainRight
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
