import type { MeasureText } from '../../text/types'
import {
  Position,
  type AxisScaleConfig,
  type CartesianSeries,
} from '../../config/types'
import { computeAxisLayout } from './axis'
import type { AxisLayout } from './types/axis'
import type { PlotRect } from '../types'
import { computeAdaptivePadding } from './adaptivePadding'
import type { AxisConfig } from './axis'
import { createScale, type ContinuousScale } from './scale'

export type YDomainPolicy = {
  mode: 'include-zero' | 'data' | 'fixed'
  min?: number
  max?: number
}

function resolveAreaBaselineDomain(
  series: CartesianSeries
): number | undefined {
  if (series.type !== 'area') return undefined
  const baseline = series.baseline ?? 'zero'
  // Baseline validation belongs here for future non-linear scales (e.g. log).
  return baseline === 'zero' ? 0 : baseline
}

function computeYDataExtents(series: CartesianSeries[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const s of series) {
    for (const p of s.points) {
      if (p.y === null) continue
      min = Math.min(min, p.y)
      max = Math.max(max, p.y)
    }
  }
  return [min, max]
}

function includeAreaBaselinesInExtents(
  series: CartesianSeries[],
  extents: [number, number]
): [number, number] {
  let [min, max] = extents
  for (const s of series) {
    const baseline = resolveAreaBaselineDomain(s)
    if (!isFiniteBaseline(baseline)) continue
    min = Math.min(min, baseline)
    max = Math.max(max, baseline)
  }
  return [min, max]
}

function isFiniteBaseline(baseline: number | undefined): baseline is number {
  return baseline !== undefined && Number.isFinite(baseline)
}

function applyYDomainPolicy(
  yMin: number,
  yMax: number,
  policy: YDomainPolicy | undefined
): [number, number] {
  const resolved = resolveYDomainPolicy(policy)
  switch (resolved.mode) {
    case 'data':
      return [yMin, yMax]
    case 'include-zero':
      return [Math.min(0, yMin), Math.max(0, yMax)]
    case 'fixed':
      return normalizeEqualDomain([resolved.min, resolved.max])
  }
}

type ResolvedYDomainPolicy =
  | { mode: 'include-zero' }
  | { mode: 'data' }
  | { mode: 'fixed'; min: number; max: number }

function resolveYDomainPolicy(
  policy: YDomainPolicy | undefined
): ResolvedYDomainPolicy {
  if (policy === undefined) return { mode: 'include-zero' }
  if (policy.mode === 'data') return { mode: 'data' }
  if (policy.mode === 'include-zero') return { mode: 'include-zero' }
  return resolveFixedYDomainPolicy(policy)
}

function resolveFixedYDomainPolicy(
  policy: YDomainPolicy
): ResolvedYDomainPolicy {
  if (policy.min === undefined) return { mode: 'data' }
  if (policy.max === undefined) return { mode: 'data' }
  return { mode: 'fixed', min: policy.min, max: policy.max }
}

function normalizeEqualDomain(domain: [number, number]): [number, number] {
  return domain[0] === domain[1] ? [domain[0], domain[0] + 1] : domain
}

function normalizeDataDomain(domain: [number, number]): [number, number] {
  const isEmpty = domain[0] === Infinity || domain[1] === -Infinity
  return isEmpty ? [0, 1] : normalizeEqualDomain(domain)
}

function computeXDomain(series: CartesianSeries[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const item of series) {
    for (const point of item.points) {
      if (point.y === null) continue
      min = Math.min(min, point.x)
      max = Math.max(max, point.x)
    }
  }
  return normalizeDataDomain([min, max])
}

function computeYDomain(
  series: CartesianSeries[],
  policy: YDomainPolicy | undefined
): [number, number] {
  const extents = includeAreaBaselinesInExtents(
    series,
    computeYDataExtents(series)
  )
  const normalized = normalizeDataDomain(extents)
  return applyYDomainPolicy(normalized[0], normalized[1], policy)
}

type ResolvedYDomains =
  | { mode: 'single'; domain: [number, number] }
  | {
      mode: 'dual'
      left: [number, number]
      right: [number, number]
    }

function resolveYDomains(
  leftSeries: CartesianSeries[],
  rightSeries: CartesianSeries[],
  rightDomain: [number, number] | undefined,
  policy: YDomainPolicy | undefined
): ResolvedYDomains {
  const dual = rightSeries.length > 0 || rightDomain !== undefined
  if (!dual) {
    return { mode: 'single', domain: computeYDomain(leftSeries, policy) }
  }
  return {
    mode: 'dual',
    left: computeYDomain(leftSeries, policy),
    right:
      rightDomain === undefined
        ? computeYDomain(rightSeries, policy)
        : normalizeEqualDomain(rightDomain),
  }
}

export type CartesianLayoutResult = {
  plotRect: PlotRect
  scales: CartesianScales
  axes: {
    x: AxisLayout
    y?: AxisLayout
    yRight?: AxisLayout
  }
  xDomain: [number, number]
  yDomain: [number, number]
  /** Present when dual-scale. yDomain remains left domain for backward compat. */
  yDomainLeft?: [number, number]
  yDomainRight?: [number, number]
}

export type CartesianScalesSingle = {
  x: ContinuousScale
  y: ContinuousScale
}

export type CartesianScalesDual = {
  x: ContinuousScale
  yLeft: ContinuousScale
  yRight: ContinuousScale
}

export type CartesianScales = CartesianScalesSingle | CartesianScalesDual

type CartesianLayoutOptions = {
  padding: { top: number; right: number; bottom: number; left: number }
  xAxis?: AxisConfig
  yAxis?: AxisConfig | null
  yAxisRight?: AxisConfig
  yAxisRightDomain?: [number, number]
  /** Explicit x domain. When omitted, the x domain is derived from series points. */
  xDomain?: [number, number]
  /**
   * Category labels for the x axis, indexed by integer x position
   * (position i shows xTickLabels[i]). Forwarded to the x axis layout only;
   * line callers pass neither this nor xDomain and keep derived domains.
   */
  xTickLabels?: readonly string[]
  yDomain?: YDomainPolicy
  enableAdaptivePadding?: boolean
  axisTickFont?: string
  axisLabelFont?: string
  locale?: string
  compactThreshold?: number
  xScale?: AxisScaleConfig
  yScale?: AxisScaleConfig
}

function partitionSeries(series: CartesianSeries[]): {
  left: CartesianSeries[]
  right: CartesianSeries[]
} {
  const left: CartesianSeries[] = []
  const right: CartesianSeries[] = []
  for (const item of series) {
    const target = item.yAxis === 'right' ? right : left
    target.push(item)
  }
  return { left, right }
}

function domainSides(domains: ResolvedYDomains): {
  left: [number, number]
  right: [number, number]
} {
  return domains.mode === 'dual'
    ? domains
    : { left: domains.domain, right: domains.domain }
}

function resolveRightPaddingScale(
  domains: ResolvedYDomains,
  config: AxisScaleConfig | undefined
): ContinuousScale | undefined {
  return domains.mode === 'dual'
    ? createScale(config, domains.right, [0, 1])
    : undefined
}

function resolveXTickCount(config: AxisConfig | undefined): number {
  return config?.tickCount === undefined ? 5 : config.tickCount
}

function resolveYTickCount(options: CartesianLayoutOptions): number {
  return options.yAxis
    ? resolveXTickCount(options.yAxis)
    : resolveXTickCount(options.yAxisRight)
}

function resolvePadding(
  size: { width: number; height: number },
  domains: {
    x: [number, number]
    y: ResolvedYDomains
  },
  measureText: MeasureText,
  options: CartesianLayoutOptions
): CartesianLayoutOptions['padding'] {
  if (options.enableAdaptivePadding === false) return options.padding
  const sides = domainSides(domains.y)
  const xScale = createScale(options.xScale, domains.x, [0, 1])
  const yScale = createScale(options.yScale, sides.left, [0, 1])
  const yScaleRight = resolveRightPaddingScale(domains.y, options.yScale)
  const adaptive = computeAdaptivePadding(
    size.width,
    size.height,
    xScale,
    yScale,
    measureText,
    options.xAxis,
    options.yAxis ?? undefined,
    options.yAxisRight,
    resolveXTickCount(options.xAxis),
    resolveYTickCount(options),
    {
      axisTickFont: options.axisTickFont,
      axisLabelFont: options.axisLabelFont,
      yScaleRight,
      locale: options.locale,
      compactThreshold: options.compactThreshold,
      xTickLabels: options.xTickLabels,
    }
  )
  return {
    top: Math.max(options.padding.top, adaptive.top),
    right: Math.max(options.padding.right, adaptive.right),
    bottom: Math.max(options.padding.bottom, adaptive.bottom),
    left: Math.max(options.padding.left, adaptive.left),
  }
}

function computePlotRect(
  size: { width: number; height: number },
  padding: CartesianLayoutOptions['padding']
): PlotRect {
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(0, size.width - padding.left - padding.right),
    height: Math.max(0, size.height - padding.top - padding.bottom),
  }
}

type ScaleLayouts =
  | {
      mode: 'single'
      publicScales: CartesianScalesSingle
      xAxis: ContinuousScale
      yAxisLeft: ContinuousScale
      yAxisRight: ContinuousScale
    }
  | {
      mode: 'dual'
      publicScales: CartesianScalesDual
      xAxis: ContinuousScale
      yAxisLeft: ContinuousScale
      yAxisRight: ContinuousScale
    }

function createLayoutScales(
  xDomain: [number, number],
  yDomains: ResolvedYDomains,
  plotRect: PlotRect,
  options: CartesianLayoutOptions
): ScaleLayouts {
  const sides = domainSides(yDomains)
  const xRange: [number, number] = [plotRect.x, plotRect.x + plotRect.width]
  const yRange: [number, number] = [plotRect.y + plotRect.height, plotRect.y]
  const x = createScale(options.xScale, xDomain, xRange)
  const yLeft = createScale(options.yScale, sides.left, yRange)
  const yRight = createScale(options.yScale, sides.right, yRange)
  const axisScales = {
    xAxis: createScale(options.xScale, xDomain, [0, plotRect.width]),
    yAxisLeft: createScale(options.yScale, sides.left, [plotRect.height, 0]),
    yAxisRight: createScale(options.yScale, sides.right, [plotRect.height, 0]),
  }
  return yDomains.mode === 'dual'
    ? {
        mode: 'dual',
        publicScales: { x, yLeft, yRight },
        ...axisScales,
      }
    : {
        mode: 'single',
        publicScales: { x, y: yLeft },
        ...axisScales,
      }
}

function createAxes(
  scales: ScaleLayouts,
  measureText: MeasureText,
  options: CartesianLayoutOptions
): CartesianLayoutResult['axes'] {
  const axisOptions = {
    axisTickFont: options.axisTickFont,
    axisLabelFont: options.axisLabelFont,
    locale: options.locale,
    compactThreshold: options.compactThreshold,
  }
  const axes: CartesianLayoutResult['axes'] = {
    x: computeAxisLayout(
      Position.BOTTOM,
      scales.xAxis,
      measureText,
      options.xAxis,
      {
        ...axisOptions,
        tickLabels: options.xTickLabels,
      }
    ),
  }
  if (options.yAxis !== null && options.yAxis !== undefined) {
    axes.y = computeAxisLayout(
      Position.LEFT,
      scales.yAxisLeft,
      measureText,
      options.yAxis,
      axisOptions
    )
  }
  if (options.yAxisRight !== undefined) {
    axes.yRight = computeAxisLayout(
      Position.RIGHT,
      scales.yAxisRight,
      measureText,
      options.yAxisRight,
      axisOptions
    )
  }
  return axes
}

function createLayoutResult(
  plotRect: PlotRect,
  scales: ScaleLayouts,
  axes: CartesianLayoutResult['axes'],
  xDomain: [number, number],
  yDomains: ResolvedYDomains
): CartesianLayoutResult {
  if (yDomains.mode === 'single') {
    return {
      plotRect,
      scales: scales.publicScales,
      axes,
      xDomain,
      yDomain: yDomains.domain,
    }
  }
  return {
    plotRect,
    scales: scales.publicScales,
    axes,
    xDomain,
    yDomain: yDomains.left,
    yDomainLeft: yDomains.left,
    yDomainRight: yDomains.right,
  }
}

export function computeCartesianLayout(
  series: CartesianSeries[],
  size: { width: number; height: number },
  measureText: MeasureText,
  options: CartesianLayoutOptions
): CartesianLayoutResult {
  const xDomain =
    options.xDomain === undefined
      ? computeXDomain(series)
      : normalizeEqualDomain(options.xDomain)
  const partitioned = partitionSeries(series)
  const yDomains = resolveYDomains(
    partitioned.left,
    partitioned.right,
    options.yAxisRightDomain,
    options.yDomain
  )
  const padding = resolvePadding(
    size,
    { x: xDomain, y: yDomains },
    measureText,
    options
  )
  const plotRect = computePlotRect(size, padding)
  const scales = createLayoutScales(xDomain, yDomains, plotRect, options)
  const axes = createAxes(scales, measureText, options)
  return createLayoutResult(plotRect, scales, axes, xDomain, yDomains)
}
