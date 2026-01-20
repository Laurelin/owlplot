import { Position, type LineChartConfig } from '../../config/types'
import type { ChartEnvironment } from '../../env/types.ts'
import type { ChartSize } from '../types'
import { SceneNodeKind, type SceneNode } from '../../scene/types'

import { computeCartesianLayout } from '../cartesian2d/layout'
import { mergePadding } from '../../config/helpers'

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

function axisToSceneNodes(
  axis: ReturnType<typeof computeCartesianLayout>['axes'][keyof ReturnType<
    typeof computeCartesianLayout
  >['axes']],
  plotRect: { x: number; y: number; width: number; height: number }
): SceneNode[] {
  const nodes: SceneNode[] = []

  const isHorizontal =
    axis.orientation === Position.BOTTOM || axis.orientation === Position.TOP

  const tx = isHorizontal ? 0 : plotRect.x
  const ty =
    axis.orientation === Position.BOTTOM
      ? plotRect.y + plotRect.height
      : axis.orientation === Position.TOP
        ? plotRect.y
        : 0

  // axis line
  nodes.push({
    kind: SceneNodeKind.PATH,
    id: `axis-line:${axis.orientation}`,
    transform: `translate(${tx},${ty})`,
    d: `M ${axis.line.x1} ${axis.line.y1} L ${axis.line.x2} ${axis.line.y2}`,
    style: { stroke: 'currentColor', strokeWidth: 1 },
  })

  // ticks & labels
  axis.ticks.forEach((tick, i) => {
    const label = axis.labelLayouts[i]

    if (!label) return

    const tickPosX = isHorizontal ? tick.position : axis.line.x1
    const tickPosY = isHorizontal ? axis.line.y1 : tick.position

    const tickEndX =
      axis.orientation === Position.LEFT
        ? tickPosX - axis.tickSize
        : axis.orientation === Position.RIGHT
          ? tickPosX + axis.tickSize
          : tickPosX

    const tickEndY =
      axis.orientation === Position.BOTTOM
        ? tickPosY + axis.tickSize
        : axis.orientation === Position.TOP
          ? tickPosY - axis.tickSize
          : tickPosY

    nodes.push({
      kind: SceneNodeKind.PATH,
      id: `axis-tick:${axis.orientation}:${i}`,
      transform: `translate(${tx},${ty})`,
      d: `M ${tickPosX} ${tickPosY} L ${tickEndX} ${tickEndY}`,
      style: { stroke: 'currentColor', strokeWidth: 1 },
    })

    nodes.push({
      kind: SceneNodeKind.TEXT,
      id: `axis-tick-label:${axis.orientation}:${i}`,
      x: label.x,
      y: label.y,
      text: label.text,
      textAnchor: label.textAnchor,
      dominantBaseline: label.dominantBaseline,
      transform: `translate(${tx},${ty})`,
      style: { fill: 'currentColor', fontSizePx: 12 },
    })
  })

  if (axis.axisLabelLayout) {
    const al = axis.axisLabelLayout
    nodes.push({
      kind: SceneNodeKind.TEXT,
      id: `axis-label:${axis.orientation}`,
      x: al.x,
      y: al.y,
      text: al.text,
      textAnchor: al.textAnchor,
      dominantBaseline: al.dominantBaseline,
      transform: `translate(${tx},${ty})`,
      style: { fill: 'currentColor', fontSizePx: 14 },
    })
  }

  return nodes
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
