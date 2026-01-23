import type { MeasureText } from '../../text/types'
import { Position, type LineSeries } from '../../config/types'
import { computeAxisLayout } from './axis'
import type { AxisLayout } from './types/axis'
import type { PlotRect } from '../types'
import { computeAdaptivePadding } from './adaptivePadding'
import type { AxisConfig } from './axis'

export type CartesianLayoutResult = {
  plotRect: PlotRect
  scales: {
    x: (value: number) => number
    y: (value: number) => number
    xInvert: (px: number) => number
    yInvert: (py: number) => number
  }
  axes: {
    x: AxisLayout
    y: AxisLayout
    yRight?: AxisLayout
  }
  xDomain: [number, number]
  yDomain: [number, number]
}

export function computeCartesianLayout(
  series: LineSeries[],
  size: { width: number; height: number },
  measureText: MeasureText,
  options: {
    padding: { top: number; right: number; bottom: number; left: number }
    xAxis?: AxisConfig
    yAxis?: AxisConfig
    yAxisRight?: AxisConfig
    enableAdaptivePadding?: boolean
    axisTickFont?: string
    axisLabelFont?: string
  }
): CartesianLayoutResult {
  // 1) figure domain extents
  let xMin = Infinity,
    xMax = -Infinity,
    yMin = Infinity,
    yMax = -Infinity

  for (const s of series) {
    for (const p of s.points) {
      if (p.y === null) continue
      if (p.x < xMin) xMin = p.x
      if (p.x > xMax) xMax = p.x
      if (p.y < yMin) yMin = p.y
      if (p.y > yMax) yMax = p.y
    }
  }

  // degenerate domain protection
  if (xMin === Infinity || xMax === -Infinity) {
    xMin = 0
    xMax = 1
  }
  if (yMin === Infinity || yMax === -Infinity) {
    yMin = 0
    yMax = 1
  }
  if (xMin === xMax) xMax = xMin + 1
  if (yMin === yMax) yMax = yMin + 1

  // 2) compute adaptive padding if enabled
  const userPadding = options.padding
  let finalPadding = userPadding

  if (options.enableAdaptivePadding !== false) {
    const xTickCount = options.xAxis?.tickCount
    const yTickCount = options.yAxis?.tickCount
    const adaptivePadding = computeAdaptivePadding(
      size.width,
      size.height,
      [xMin, xMax],
      [yMin, yMax],
      measureText,
      options.xAxis,
      options.yAxis,
      options.yAxisRight,
      xTickCount ?? 5,
      yTickCount ?? 5,
      {
        axisTickFont: options.axisTickFont,
        axisLabelFont: options.axisLabelFont,
      }
    )

    // merge user padding with adaptive padding (max of each side)
    finalPadding = {
      top: Math.max(userPadding.top, adaptivePadding.top),
      right: Math.max(userPadding.right, adaptivePadding.right),
      bottom: Math.max(userPadding.bottom, adaptivePadding.bottom),
      left: Math.max(userPadding.left, adaptivePadding.left),
    }
  }

  // 3) compute plot rect from final padding
  const { top, right, bottom, left } = finalPadding
  const plotRect: PlotRect = {
    x: left,
    y: top,
    width: Math.max(0, size.width - left - right),
    height: Math.max(0, size.height - top - bottom),
  }

  // 4) build scale functions
  const xScale = (v: number): number =>
    plotRect.x + ((v - xMin) / (xMax - xMin)) * plotRect.width

  const yScale = (v: number): number =>
    plotRect.y +
    plotRect.height -
    ((v - yMin) / (yMax - yMin)) * plotRect.height

  // 5) build scale inversion functions (for axis-aligned hover)
  const xInvert = (px: number): number => {
    const relativeX = (px - plotRect.x) / plotRect.width
    return xMin + relativeX * (xMax - xMin)
  }

  const yInvert = (py: number): number => {
    const relativeY = (plotRect.height - (py - plotRect.y)) / plotRect.height
    return yMin + relativeY * (yMax - yMin)
  }

  // 6) axis layouts (local axis coords)
  const xAxis: AxisLayout = computeAxisLayout(
    Position.BOTTOM,
    [xMin, xMax],
    [0, plotRect.width],
    measureText,
    options.xAxis,
    {
      axisTickFont: options.axisTickFont,
      axisLabelFont: options.axisLabelFont,
    }
  )

  const yAxis: AxisLayout = computeAxisLayout(
    Position.LEFT,
    [yMin, yMax],
    [plotRect.height, 0], // reversed: bottom to top for standard Y-axis
    measureText,
    options.yAxis,
    {
      axisTickFont: options.axisTickFont,
      axisLabelFont: options.axisLabelFont,
    }
  )

  const yAxisRight: AxisLayout | undefined = options.yAxisRight
    ? computeAxisLayout(
        Position.RIGHT,
        [yMin, yMax],
        [plotRect.height, 0], // reversed: bottom to top for standard Y-axis
        measureText,
        options.yAxisRight,
        {
          axisTickFont: options.axisTickFont,
          axisLabelFont: options.axisLabelFont,
        }
      )
    : undefined

  return {
    plotRect,
    scales: { x: xScale, y: yScale, xInvert, yInvert },
    axes: { x: xAxis, y: yAxis, yRight: yAxisRight },
    xDomain: [xMin, xMax],
    yDomain: [yMin, yMax],
  }
}
