import { Position, type LineChartConfig } from '../../config/types'
import type { ChartEnvironment } from '../../env/types.ts'
import type { ChartSize } from '../types'
import { SceneNodeKind, type SceneNode } from '../../scene/types'

import { computeCartesianLayout } from '../cartesian2d/layout'
import { mergePadding } from '../../config/helpers'
import { AxisLayout } from '../cartesian2d/types/axis'

function buildLinePathD(
  data: { x: number; y: number | null }[],
  xScale: (value: number) => number,
  yScale: (value: number) => number
): string {
  let d = ''
  let started = false

  for (const pt of data) {
    if (pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x)) {
      started = false
      continue
    }
    const px = xScale(pt.x)
    const py = yScale(pt.y)

    if (!started) {
      d += `M ${px} ${py}`
      started = true
    } else {
      d += ` L ${px} ${py}`
    }
  }
  return d
}

/**
 * turn an AxisLayout into scene nodes,
 * placing them relative to the plotRect
 */
export function axisToSceneNodes(
  axis: AxisLayout,
  plotRect: { x: number; y: number; width: number; height: number }
): SceneNode[] {
  const isHorizontal =
    axis.orientation === Position.BOTTOM || axis.orientation === Position.TOP

  // the *translate* point in absolute chart space for this axis:
  const tx = plotRect.x
  const ty =
    axis.orientation === Position.BOTTOM
      ? plotRect.y + plotRect.height // bottom
      : axis.orientation === Position.TOP
        ? plotRect.y // top
        : plotRect.y

  const transform = `translate(${tx},${ty})`

  // Wrap all axis elements in a group with the transform
  // (The renderer only applies transforms to GROUP nodes)
  const children: SceneNode[] = []

  // axis line
  children.push({
    kind: SceneNodeKind.PATH,
    id: `axis-line:${axis.orientation}`,
    d: `M ${axis.line.x1} ${axis.line.y1} L ${axis.line.x2} ${axis.line.y2}`,
    style: { stroke: 'currentColor', strokeWidth: 1 },
  })

  // ticks and tick labels
  axis.ticks.forEach((tick, i) => {
    const lbl = axis.labelLayouts[i]

    // tick mark
    let tickStart: [number, number]
    let tickEnd: [number, number]

    if (isHorizontal) {
      // bottom or top axis
      tickStart = [tick.position, axis.line.y1]
      tickEnd = [
        tick.position,
        axis.orientation === Position.BOTTOM
          ? axis.line.y1 + axis.tickSize
          : axis.line.y1 - axis.tickSize,
      ]
    } else {
      // left or right axis
      tickStart = [axis.line.x1, tick.position]
      tickEnd = [axis.line.x1 - axis.tickSize, tick.position]
    }

    children.push({
      kind: SceneNodeKind.PATH,
      id: `axis-tick:${axis.orientation}:${i}`,
      d: `M ${tickStart[0]} ${tickStart[1]} L ${tickEnd[0]} ${tickEnd[1]}`,
      style: { stroke: 'currentColor', strokeWidth: 1 },
    })

    if (lbl) {
      children.push({
        kind: SceneNodeKind.TEXT,
        id: `axis-tick-label:${axis.orientation}:${i}`,
        x: lbl.x,
        y: lbl.y,
        text: lbl.text,
        textAnchor: lbl.textAnchor,
        dominantBaseline: lbl.dominantBaseline,
        style: { fill: 'currentColor', fontSizePx: 12 },
      })
    }
  })

  // optional axis title
  if (axis.axisLabelLayout) {
    const al = axis.axisLabelLayout
    children.push({
      kind: SceneNodeKind.TEXT,
      id: `axis-label:${axis.orientation}`,
      x: al.x,
      y: al.y,
      text: al.text,
      textAnchor: al.textAnchor,
      dominantBaseline: al.dominantBaseline,
      style: { fill: 'currentColor', fontSizePx: 14 },
    })
  }

  // Return a single group node with the transform
  return [
    {
      kind: SceneNodeKind.GROUP,
      id: `axis-group:${axis.orientation}`,
      transform,
      children,
    },
  ]
}

export function scene(
  config: LineChartConfig,
  size: ChartSize,
  env: ChartEnvironment
): { scene: SceneNode } {
  const padding = mergePadding(config.options?.padding)

  const xAxisConfig: { tickCount?: number; axisLabel?: string } = {
    tickCount: config.options?.xTickCount,
    axisLabel: config.options?.xLabel,
  }

  const yAxisConfig: { tickCount?: number; axisLabel?: string } = {
    tickCount: config.options?.yTickCount,
    axisLabel: config.options?.yLabel,
  }

  const { plotRect, scales, axes } = computeCartesianLayout(
    config.series,
    size,
    env.measureText,
    {
      padding,
      xAxis: xAxisConfig,
      yAxis: yAxisConfig,
    }
  )

  const children: SceneNode[] = []

  // background (optional)
  children.push({
    kind: SceneNodeKind.RECT,
    id: 'background',
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    style: { fill: 'transparent' },
  })

  // axes
  children.push(
    ...axisToSceneNodes(axes.x, plotRect),
    ...axisToSceneNodes(axes.y, plotRect)
  )

  // line paths and optional points
  for (const series of config.series) {
    children.push({
      kind: SceneNodeKind.PATH,
      id: `series:${series.id}`,
      d: buildLinePathD(series.points, scales.x, scales.y),
      style: { fill: 'transparent', stroke: 'currentColor', strokeWidth: 2 },
    })

    if (config.options?.showPoints) {
      series.points.forEach((pt, index) => {
        if (pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x))
          return
        children.push({
          kind: SceneNodeKind.CIRCLE,
          id: `point:${series.id}:${index}`,
          cx: scales.x(pt.x),
          cy: scales.y(pt.y),
          r: 2.5,
          style: { fill: 'currentColor' },
        })
      })
    }
  }

  return {
    scene: {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children,
    },
  }
}
