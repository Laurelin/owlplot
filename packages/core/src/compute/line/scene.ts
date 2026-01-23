import { Position, type LineChartConfig } from '../../config/types'
import type { ChartEnvironment } from '../../env/types.ts'
import type { ChartSize } from '../types'
import { SceneNodeKind, type SceneNode, createSceneTooltip } from '../../scene/types'

import { computeCartesianLayout } from '../cartesian2d/layout'
import { mergePadding } from '../../config/helpers'
import { AxisLayout } from '../cartesian2d/types/axis'
import type { AxisConfig } from '../cartesian2d/axis'
import { DEFAULT_TICK_FONT, DEFAULT_LABEL_FONT } from '../cartesian2d/axis'
import { LabelOrientation } from '../cartesian2d/types/axis'

/**
 * Core → Renderer Contract for Hover Metadata:
 * 
 * hover.sortedPoints:
 * - filtered (finite x/y, y !== null)
 * - sorted ascending by x
 * - immutable for renderer lifetime (frozen)
 * 
 * Renderer MUST use sortedPoints directly - NO per-hover sorting or filtering.
 * This is a one-time cost during scene computation, not per mousemove.
 */
export type HoverSeries = {
  id: string
  sortedPoints: ReadonlyArray<{ x: number; y: number }>
}

/**
 * Extract font size in pixels from a font string like "8pt sans-serif" or "12px Arial"
 * Returns the size in pixels (converting pt to px if needed: 1pt ≈ 1.33px)
 */
function extractFontSizePx(fontString: string | undefined): number {
  if (!fontString) return 10 // fallback
  const match = /(\d+(?:\.\d+)?)(pt|px)/i.exec(fontString)
  if (!match) return 10 // fallback
  const size = Number(match[1])
  const unit = match[2]?.toLowerCase()
  if (!unit) return 10 // fallback
  // Convert pt to px: 1pt = 4/3px ≈ 1.33px
  return unit === 'pt' ? size * (4 / 3) : size
}

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
  plotRect: { x: number; y: number; width: number; height: number },
  tickFont?: string,
  labelFont?: string,
  isYAxis = false,
  hideLabelAtIntersection = false
): SceneNode[] {
  const isHorizontal =
    axis.orientation === Position.BOTTOM || axis.orientation === Position.TOP

  // the *translate* point in absolute chart space for this axis:
  let tx = plotRect.x
  let ty = plotRect.y

  if (axis.orientation === Position.BOTTOM) {
    ty = plotRect.y + plotRect.height // bottom
  } else if (axis.orientation === Position.TOP) {
    ty = plotRect.y // top
  } else if (axis.orientation === Position.LEFT) {
    tx = plotRect.x // left
    ty = plotRect.y
  } else if (axis.orientation === Position.RIGHT) {
    tx = plotRect.x + plotRect.width // right
    ty = plotRect.y
  }

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
      // Skip label at intersection (Y-axis at value 0 when X-axis also has 0)
      // For vertical axes, intersection is at the bottom (y1 for reversed range)
      const isAtIntersection =
        isYAxis &&
        hideLabelAtIntersection &&
        Math.abs(tick.value) < 1e-10 &&
        Math.abs(tick.position - axis.line.y1) < 1e-10

      if (!isAtIntersection) {
        const transform =
          lbl.rotation !== undefined
            ? `rotate(${lbl.rotation} ${lbl.x} ${lbl.y})`
            : undefined
        const fontSizePx = extractFontSizePx(tickFont ?? DEFAULT_TICK_FONT)
        children.push({
          kind: SceneNodeKind.TEXT,
          id: `axis-tick-label:${axis.orientation}:${i}`,
          x: lbl.x,
          y: lbl.y,
          text: lbl.text,
          textAnchor: lbl.textAnchor,
          dominantBaseline: lbl.dominantBaseline,
          transform,
          style: { fill: 'currentColor', fontSizePx },
        })
      }
    }
  })

  // optional axis title
  if (axis.axisLabelLayout) {
    const al = axis.axisLabelLayout
    const fontSizePx = extractFontSizePx(labelFont ?? DEFAULT_LABEL_FONT)
    children.push({
      kind: SceneNodeKind.TEXT,
      id: `axis-label:${axis.orientation}`,
      x: al.x,
      y: al.y,
      text: al.text,
      textAnchor: al.textAnchor,
      dominantBaseline: al.dominantBaseline,
      style: { fill: 'currentColor', fontSizePx },
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

  const bottomAxisConfig: AxisConfig = {
    tickCount: config.options?.xTickCount,
    axisLabel: config.options?.xLabel,
    labelOrientation: config.options?.xLabelOrientation
      ? {
          orientation: config.options.xLabelOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: config.options.xLabelOrientation.angle,
        }
      : undefined,
  }

  const leftAxisConfig: AxisConfig = {
    tickCount: config.options?.yTickCount,
    axisLabel: config.options?.yLabel,
    labelOrientation: config.options?.yLabelOrientation
      ? {
          orientation: config.options.yLabelOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: config.options.yLabelOrientation.angle,
        }
      : undefined,
  }

  const rightAxisConfig: AxisConfig | undefined = config.options?.yAxisRight
    ? {
        tickCount: config.options.yAxisRight.tickCount,
        axisLabel: config.options.yAxisRight.axisLabel,
        labelOrientation: config.options.yAxisRight.labelOrientation
          ? {
              orientation: config.options.yAxisRight.labelOrientation
                .orientation as LabelOrientation | undefined,
              angle: config.options.yAxisRight.labelOrientation.angle,
            }
          : undefined,
      }
    : undefined

  const { plotRect, scales, axes, xDomain, yDomain } = computeCartesianLayout(
    config.series,
    size,
    env.measureText,
    {
      padding,
      xAxis: bottomAxisConfig,
      yAxis: leftAxisConfig,
      yAxisRight: rightAxisConfig,
      enableAdaptivePadding: config.options?.enableAdaptivePadding ?? true,
      axisTickFont: config.options?.axisTickFont,
      axisLabelFont: config.options?.axisLabelFont,
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

  // Get X-axis domain to check for intersection
  const xAxisDomain = axes.x.ticks.map(t => t.value)
  const xAxisHasZero = xAxisDomain.some(v => Math.abs(v) < 1e-10)

  // axes
  children.push(
    ...axisToSceneNodes(
      axes.x,
      plotRect,
      config.options?.axisTickFont,
      config.options?.axisLabelFont,
      false // isYAxis
    ),
    ...axisToSceneNodes(
      axes.y,
      plotRect,
      config.options?.axisTickFont,
      config.options?.axisLabelFont,
      true, // isYAxis
      xAxisHasZero // hideLabelAtIntersection
    )
  )
  if (axes.yRight) {
    children.push(
      ...axisToSceneNodes(
        axes.yRight,
        plotRect,
        config.options?.axisTickFont,
        config.options?.axisLabelFont,
        true, // isYAxis
        xAxisHasZero // hideLabelAtIntersection
      )
    )
  }

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
          metadata: {
            tooltip: createSceneTooltip('point', { x: pt.x, y: pt.y }, { seriesId: series.id })
          }
        })
      })
    }
  }

  return {
    scene: {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children,
      metadata: {
        hover: {
          xInvert: scales.xInvert,
          yInvert: scales.yInvert,
          scales: { x: scales.x, y: scales.y },
          plotRect,
          xDomain,
          yDomain,
          series: config.series.map((s): HoverSeries => {
            // Filter valid points and sort by x ONCE (core guarantees sorted)
            const validPoints = s.points
              .filter(p => p.y !== null && Number.isFinite(p.x) && Number.isFinite(p.y))
              .map(p => ({ x: p.x, y: p.y! }))
              .sort((a, b) => a.x - b.x)  // Sort once, not per hover
            
            // Freeze to signal immutability and prevent accidental mutation
            const sortedPoints = Object.freeze(validPoints)
            
            return {
              id: s.id,
              sortedPoints  // Pre-sorted, pre-filtered, frozen for hover lookup
            }
          })
        }
      }
    },
  }
}
