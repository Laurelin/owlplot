import type { MeasureText } from '../../text/types'
import { Position, type CartesianSeries } from '../../config/types'
import { computeAxisLayout } from './axis'
import type { AxisLayout } from './types/axis'
import type { PlotRect } from '../types'
import { computeAdaptivePadding } from './adaptivePadding'
import type { AxisConfig } from './axis'
import { createLinearScale, type ContinuousScale } from './scale'

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
      if (p.y < min) min = p.y
      if (p.y > max) max = p.y
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
    if (baseline === undefined || !Number.isFinite(baseline)) continue
    if (baseline < min) min = baseline
    if (baseline > max) max = baseline
  }
  return [min, max]
}

function applyYDomainPolicy(
  yMin: number,
  yMax: number,
  policy: YDomainPolicy | undefined
): [number, number] {
  const mode = policy?.mode ?? 'include-zero'
  if (mode === 'data') return [yMin, yMax]
  if (mode === 'include-zero') {
    return [Math.min(0, yMin), Math.max(0, yMax)]
  }
  if (
    mode === 'fixed' &&
    policy?.min !== undefined &&
    policy?.max !== undefined
  ) {
    const min = policy.min
    let max = policy.max
    if (min === max) max = min + 1
    return [min, max]
  }
  return [yMin, yMax]
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

export function computeCartesianLayout(
  series: CartesianSeries[],
  size: { width: number; height: number },
  measureText: MeasureText,
  options: {
    padding: { top: number; right: number; bottom: number; left: number }
    xAxis?: AxisConfig
    /** When null, no left Y axis (right-only mode). When undefined, use left axis. */
    yAxis?: AxisConfig | null
    yAxisRight?: AxisConfig
    /** Explicit right Y domain (dual-scale). If absent, derived from series with yAxis: 'right'. */
    yAxisRightDomain?: [number, number]
    /** Y-axis domain policy. Default include-zero when undefined. */
    yDomain?: YDomainPolicy
    enableAdaptivePadding?: boolean
    axisTickFont?: string
    axisLabelFont?: string
    locale?: string
    compactThreshold?: number
  }
): CartesianLayoutResult {
  // 1) X domain and partition series by Y axis
  let xMin = Infinity,
    xMax = -Infinity
  for (const s of series) {
    for (const p of s.points) {
      if (p.y === null) continue
      if (p.x < xMin) xMin = p.x
      if (p.x > xMax) xMax = p.x
    }
  }
  if (xMin === Infinity || xMax === -Infinity) {
    xMin = 0
    xMax = 1
  }
  if (xMin === xMax) xMax = xMin + 1

  const leftSeries = series.filter(s => s.yAxis !== 'right')
  const rightSeries = series.filter(s => s.yAxis === 'right')
  const isDualScale =
    rightSeries.length > 0 || options.yAxisRightDomain !== undefined

  // 2) Resolved Y scales (scale config: domain per side)
  let yMin: number
  let yMax: number
  let yMinLeft: number
  let yMaxLeft: number
  let yMinRight: number
  let yMaxRight: number

  if (isDualScale) {
    ;[yMinLeft, yMaxLeft] = includeAreaBaselinesInExtents(
      leftSeries,
      computeYDataExtents(leftSeries)
    )
    if (yMinLeft === Infinity || yMaxLeft === -Infinity) {
      yMinLeft = 0
      yMaxLeft = 1
    }
    if (yMinLeft === yMaxLeft) yMaxLeft = yMinLeft + 1
    ;[yMinLeft, yMaxLeft] = applyYDomainPolicy(
      yMinLeft,
      yMaxLeft,
      options.yDomain
    )

    if (options.yAxisRightDomain !== undefined) {
      ;[yMinRight, yMaxRight] = options.yAxisRightDomain
      if (yMinRight === yMaxRight) yMaxRight = yMinRight + 1
    } else {
      ;[yMinRight, yMaxRight] = includeAreaBaselinesInExtents(
        rightSeries,
        computeYDataExtents(rightSeries)
      )
      if (yMinRight === Infinity || yMaxRight === -Infinity) {
        yMinRight = 0
        yMaxRight = 1
      }
      if (yMinRight === yMaxRight) yMaxRight = yMinRight + 1
      ;[yMinRight, yMaxRight] = applyYDomainPolicy(
        yMinRight,
        yMaxRight,
        options.yDomain
      )
    }
    yMin = yMinLeft
    yMax = yMaxLeft
  } else {
    ;[yMin, yMax] = includeAreaBaselinesInExtents(
      series,
      computeYDataExtents(series)
    )
    if (yMin === Infinity || yMax === -Infinity) {
      yMin = 0
      yMax = 1
    }
    if (yMin === yMax) yMax = yMin + 1
    ;[yMin, yMax] = applyYDomainPolicy(yMin, yMax, options.yDomain)
    yMinLeft = yMin
    yMaxLeft = yMax
    yMinRight = yMin
    yMaxRight = yMax
  }

  // 3) compute adaptive padding if enabled
  const userPadding = options.padding
  let finalPadding = userPadding

  if (options.enableAdaptivePadding !== false) {
    const xTickCount = options.xAxis?.tickCount
    const yTickCount =
      options.yAxis !== null && options.yAxis !== undefined
        ? options.yAxis.tickCount
        : options.yAxisRight?.tickCount
    const adaptivePadding = computeAdaptivePadding(
      size.width,
      size.height,
      [xMin, xMax],
      [yMinLeft, yMaxLeft],
      measureText,
      options.xAxis,
      options.yAxis ?? undefined,
      options.yAxisRight,
      xTickCount ?? 5,
      yTickCount ?? 5,
      {
        axisTickFont: options.axisTickFont,
        axisLabelFont: options.axisLabelFont,
        yDomainRight: isDualScale ? [yMinRight, yMaxRight] : undefined,
        locale: options.locale,
        compactThreshold: options.compactThreshold,
      }
    )

    finalPadding = {
      top: Math.max(userPadding.top, adaptivePadding.top),
      right: Math.max(userPadding.right, adaptivePadding.right),
      bottom: Math.max(userPadding.bottom, adaptivePadding.bottom),
      left: Math.max(userPadding.left, adaptivePadding.left),
    }
  }

  // 4) compute plot rect from final padding
  const { top, right, bottom, left } = finalPadding
  const plotRect: PlotRect = {
    x: left,
    y: top,
    width: Math.max(0, size.width - left - right),
    height: Math.max(0, size.height - top - bottom),
  }

  // 5) build continuous scales
  const xScale = createLinearScale([xMin, xMax], [plotRect.x, plotRect.x + plotRect.width])
  const yScale = createLinearScale(
    [yMin, yMax],
    [plotRect.y + plotRect.height, plotRect.y]
  )
  const yScaleLeft = createLinearScale(
    [yMinLeft, yMaxLeft],
    [plotRect.y + plotRect.height, plotRect.y]
  )
  const yScaleRight = createLinearScale(
    [yMinRight, yMaxRight],
    [plotRect.y + plotRect.height, plotRect.y]
  )

  // 6) axis layouts (local axis coords)
  const axisLayoutOptions = {
    axisTickFont: options.axisTickFont,
    axisLabelFont: options.axisLabelFont,
    locale: options.locale,
    compactThreshold: options.compactThreshold,
  }
  const xAxis: AxisLayout = computeAxisLayout(
    Position.BOTTOM,
    [xMin, xMax],
    [0, plotRect.width],
    measureText,
    options.xAxis,
    axisLayoutOptions
  )

  const yAxis: AxisLayout | undefined =
    options.yAxis !== null && options.yAxis !== undefined
      ? computeAxisLayout(
          Position.LEFT,
          [yMinLeft, yMaxLeft],
          [plotRect.height, 0],
          measureText,
          options.yAxis,
          axisLayoutOptions
        )
      : undefined

  const yAxisRight: AxisLayout | undefined = options.yAxisRight
    ? computeAxisLayout(
        Position.RIGHT,
        [yMinRight, yMaxRight],
        [plotRect.height, 0],
        measureText,
        options.yAxisRight,
        axisLayoutOptions
      )
    : undefined

  const axes: CartesianLayoutResult['axes'] = {
    x: xAxis,
    ...(yAxis !== undefined && { y: yAxis }),
    ...(yAxisRight !== undefined && { yRight: yAxisRight }),
  }

  const scales: CartesianLayoutResult['scales'] = isDualScale
    ? { x: xScale, yLeft: yScaleLeft, yRight: yScaleRight }
    : { x: xScale, y: yScale }

  return {
    plotRect,
    scales,
    axes,
    xDomain: [xMin, xMax],
    yDomain: [yMinLeft, yMaxLeft],
    ...(isDualScale && {
      yDomainLeft: [yMinLeft, yMaxLeft] as [number, number],
      yDomainRight: [yMinRight, yMaxRight] as [number, number],
    }),
  }
}
