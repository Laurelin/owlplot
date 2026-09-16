import type {
  HoverIndicator,
  IndicatorHandle,
  HoverIndicatorConfig,
} from './types'
import { HoverIndicatorKind } from '../../shared/enums'
import {
  emphasizePoints,
  drawPointEmphasisOverlay,
  restorePointEmphasis,
  type PointEmphasisResult,
} from './pointEmphasis'
import { updateXLine, hideXLine } from './xLine'
import { updateYLine, hideYLine } from './yLine'
import { ExtendedSVGSVGElement } from '../../shared/extendedElements'
import { POINT_INDEX_SYMBOL } from '../../shared/symbols'
import type { HoverResolutionResult, HoverResolvedPoint } from '../types'

type PointEmphasisConfig = Extract<
  HoverIndicatorConfig,
  { kind: HoverIndicatorKind.POINT_EMPHASIS }
>
type XLineConfig = Extract<
  HoverIndicatorConfig,
  { kind: HoverIndicatorKind.X_LINE }
>
type YLineConfig = Extract<
  HoverIndicatorConfig,
  { kind: HoverIndicatorKind.Y_LINE }
>

function resolvedPoints(
  result: HoverResolutionResult
): HoverResolvedPoint[] | null {
  if (result.kind === 'none' || result.points.length === 0) return null
  return result.points
}

function primaryPoint(
  result: HoverResolutionResult
): HoverResolvedPoint | null {
  const points = resolvedPoints(result)
  if (!points || result.kind === 'none') return null
  return points[result.primaryIndex] ?? null
}

function pointResultKey(result: HoverResolutionResult): string | null {
  const points = resolvedPoints(result)
  if (!points) return null
  return points
    .map(point => `${point.seriesId}:${point.point.x}`)
    .sort()
    .join('|')
}

function emphasisSize(config: PointEmphasisConfig): number {
  if (config.size != null) return config.size
  return config.radius ?? 5
}

function overlayEmphasisOptions(config: PointEmphasisConfig) {
  return {
    style: config.style,
    size: config.size ?? config.radius,
  }
}

function renderOverlayEmphasis(
  points: HoverResolvedPoint[],
  context: Parameters<HoverIndicator['render']>[1],
  config: PointEmphasisConfig,
  size: number
): IndicatorHandle {
  return drawPointEmphasisOverlay(
    points,
    {
      scales: context.scales,
      svg: context.svg,
      seriesStyles: context.seriesStyles,
      seriesYAxis: context.seriesYAxis,
      emphasisOptions: overlayEmphasisOptions(config),
    },
    size
  )
}

function renderPointEmphasis(
  result: HoverResolutionResult,
  context: Parameters<HoverIndicator['render']>[1],
  config: PointEmphasisConfig
): IndicatorHandle | null {
  const points = resolvedPoints(result)
  if (!points) return null
  const pointIndex = (context.svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL]
  const size = emphasisSize(config)
  if (!pointIndex?.size) {
    return renderOverlayEmphasis(points, context, config, size)
  }
  return emphasizePoints(
    points,
    {
      scales: context.scales,
      pointIndex,
      seriesYAxis: context.seriesYAxis,
    },
    size / 2.5
  )
}

function createPointEmphasisIndicator(
  config: PointEmphasisConfig
): HoverIndicator {
  return {
    id: 'point-emphasis',
    getKey: pointResultKey,
    render: (result, context) => renderPointEmphasis(result, context, config),
    restore(handle) {
      if (handle) restorePointEmphasis(handle as PointEmphasisResult)
    },
  }
}

function createXLineIndicator(
  svg: SVGSVGElement,
  config: XLineConfig
): HoverIndicator {
  return {
    id: 'x-line',
    render(result, context) {
      const point = primaryPoint(result)
      if (!point) {
        hideXLine(svg)
        return null
      }
      const x = context.scales.x.forward(point.point.x)
      updateXLine(svg, x, context.plotRect, config.style)
      return { type: 'x-line' }
    },
    restore: () => hideXLine(svg),
  }
}

function yCoordinate(
  point: HoverResolvedPoint,
  context: Parameters<HoverIndicator['render']>[1]
): number {
  if (!('yLeft' in context.scales)) {
    return context.scales.y.forward(point.point.y)
  }
  const side = context.seriesYAxis?.[point.seriesId] ?? 'left'
  const scale = side === 'right' ? context.scales.yRight : context.scales.yLeft
  return scale.forward(point.point.y)
}

function createYLineIndicator(
  svg: SVGSVGElement,
  config: YLineConfig
): HoverIndicator {
  return {
    id: 'y-line',
    render(result, context) {
      const point = primaryPoint(result)
      if (!point) {
        hideYLine(svg)
        return null
      }
      updateYLine(
        svg,
        yCoordinate(point, context),
        context.plotRect,
        config.style
      )
      return { type: 'y-line' }
    },
    restore: () => hideYLine(svg),
  }
}

function createIndicator(
  config: HoverIndicatorConfig,
  svg: SVGSVGElement
): HoverIndicator | null {
  switch (config.kind) {
    case HoverIndicatorKind.NONE:
      return null
    case HoverIndicatorKind.POINT_EMPHASIS:
      return createPointEmphasisIndicator(config)
    case HoverIndicatorKind.X_LINE:
      return createXLineIndicator(svg, config)
    case HoverIndicatorKind.Y_LINE:
      return createYLineIndicator(svg, config)
  }
}

/**
 * Create indicator implementations from config.
 */
export function createIndicators(
  config: HoverIndicatorConfig[],
  svg: SVGSVGElement
): HoverIndicator[] {
  const indicators: HoverIndicator[] = []
  for (const indicatorConfig of config) {
    const indicator = createIndicator(indicatorConfig, svg)
    if (indicator) indicators.push(indicator)
  }
  return indicators
}
