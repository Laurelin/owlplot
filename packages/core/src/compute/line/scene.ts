import {
  Position,
  type LineChartConfig,
  type AxisVisibility,
} from '../../config/types'
import { resolvePointConfig } from '../../config/helpers'
import type { ChartEnvironment } from '../../env/types'
import type { ChartSize } from '../types'
import {
  SceneNodeKind,
  TooltipKind,
  type SceneNode,
  createSceneTooltip,
} from '../../scene/types'
import {
  DEFAULT_SOLID_CURRENT_COLOR,
  derivePaintStylesFromColor,
  normalizeGradientPaint,
  TRANSPARENT_FILL,
  type PaintStyles,
} from '../../paint/helpers'
import type { LineSeries } from '../../config/types'

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
  /** Which Y axis (scale) this series uses. Always present (single-scale: 'left'). */
  yAxis: 'left' | 'right'
  sortedPoints: ReadonlyArray<{ x: number; y: number }>
}

/**
 * Resolve axis visibility with precedence: axis-specific overrides global defaults.
 * Returns Required<AxisVisibility> to ensure all flags are explicitly boolean.
 */
function resolveAxisVisibility(
  axis: Partial<AxisVisibility> | undefined,
  global: AxisVisibility
): Required<AxisVisibility> {
  return {
    ticks: axis?.ticks ?? global.ticks ?? true,
    tickLabels: axis?.tickLabels ?? global.tickLabels ?? true,
    axisLine: axis?.axisLine ?? global.axisLine ?? true,
  }
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
 * Resolves paint styles for a series with overlay semantics.
 * Config → scene is the ONLY place strings exist - normalize immediately.
 *
 * - Base from series.color → derivePaintStylesFromColor (or DEFAULT_SOLID_CURRENT_COLOR)
 * - Then shallow-merge series.paint on top (overlay semantics)
 * - Add fill default only if points are enabled (reduces "why is fill set on everything?" confusion)
 *
 * This helper encodes the behavior so it can't drift and tests can pin it.
 */
function resolveSeriesPaint(
  series: LineSeries,
  pointsEnabled: boolean
): PaintStyles {
  const basePaint = series.color
    ? derivePaintStylesFromColor(series.color, { enableGradients: false })
    : { stroke: DEFAULT_SOLID_CURRENT_COLOR } // Only stroke for lines; fill only if points enabled

  // Add fill default only if points are enabled
  if (pointsEnabled && !basePaint.fill) {
    basePaint.fill = DEFAULT_SOLID_CURRENT_COLOR
  }

  const finalPaint = series.paint
    ? { ...basePaint, ...series.paint } // overlay: paint merges on top of base (shallow merge, intentional)
    : basePaint

  return finalPaint
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
  hideLabelAtIntersection = false,
  axisConfig?: AxisConfig
): SceneNode[] {
  // Normalize visibility flags (default: true)
  const showTicks = axisConfig?.showTicks !== false
  const showTickLabels = axisConfig?.showTickLabels !== false
  const showAxis = axisConfig?.showAxis !== false

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
  if (showAxis) {
    children.push({
      kind: SceneNodeKind.PATH,
      id: `axis-line:${axis.orientation}`,
      d: `M ${axis.line.x1} ${axis.line.y1} L ${axis.line.x2} ${axis.line.y2}`,
      style: { stroke: DEFAULT_SOLID_CURRENT_COLOR, strokeWidth: 1 },
    })
  }

  // ticks and tick labels
  axis.ticks.forEach((tick, i) => {
    const lbl = axis.labelLayouts[i]

    // tick mark
    if (showTicks) {
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
        style: { stroke: DEFAULT_SOLID_CURRENT_COLOR, strokeWidth: 1 },
      })
    }

    if (lbl && showTickLabels) {
      // Skip label at intersection (Y-axis at value 0 when X-axis also has 0)
      // For vertical axes, intersection is at the bottom (y1 for reversed range)
      const isAtIntersection =
        isYAxis &&
        hideLabelAtIntersection &&
        Math.abs(tick.value) < 1e-10 &&
        Math.abs(tick.position - axis.line.y1) < 1e-10

      if (!isAtIntersection && lbl.text !== '') {
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
          style: { fill: DEFAULT_SOLID_CURRENT_COLOR, fontSizePx },
        })
      }
    }
  })

  // optional axis title
  if (axis.axisLabelLayout) {
    const al = axis.axisLabelLayout
    const fontSizePx = extractFontSizePx(labelFont ?? DEFAULT_LABEL_FONT)
    const transform =
      al.rotation !== undefined
        ? `rotate(${al.rotation} ${al.x} ${al.y})`
        : undefined
    children.push({
      kind: SceneNodeKind.TEXT,
      id: `axis-label:${axis.orientation}`,
      x: al.x,
      y: al.y,
      text: al.text,
      textAnchor: al.textAnchor,
      dominantBaseline: al.dominantBaseline,
      transform,
      style: { fill: DEFAULT_SOLID_CURRENT_COLOR, fontSizePx },
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

  // Config normalization: set UX-friendly defaults (compute layer remains explicit + dumb)
  const xAxisTitleOrientation =
    config.options?.xAxisLabelOrientation ?? undefined
  // Default y-axis title to vertical orientation if not specified
  const yAxisTitleOrientation =
    config.options?.yAxisLabelOrientation ??
    (config.options?.yLabel
      ? { orientation: LabelOrientation.VERTICAL }
      : undefined)

  // Normalize axis visibility options
  const axisVis = config.options?.axisVisibility
  const globalVisibility: AxisVisibility = {
    ticks: axisVis?.ticks ?? true,
    tickLabels: axisVis?.tickLabels ?? true,
    axisLine: axisVis?.axisLine ?? true,
  }

  const resolvedX = resolveAxisVisibility(axisVis?.x, globalVisibility)
  const resolvedY = resolveAxisVisibility(axisVis?.y, globalVisibility)

  const bottomAxisConfig: AxisConfig = {
    tickCount: config.options?.xTickCount,
    axisLabel: config.options?.xLabel,
    axisTickFormat: config.options?.axisTickFormat,
    labelOrientation: config.options?.xLabelOrientation
      ? {
          orientation: config.options.xLabelOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: config.options.xLabelOrientation.angle,
        }
      : undefined,
    axisLabelOrientation: xAxisTitleOrientation
      ? {
          orientation: xAxisTitleOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: xAxisTitleOrientation.angle,
        }
      : undefined,
    showTicks: resolvedX.ticks,
    showTickLabels: resolvedX.tickLabels,
    showAxis: resolvedX.axisLine,
  }

  const leftAxisConfig: AxisConfig = {
    tickCount: config.options?.yTickCount,
    axisLabel: config.options?.yLabel,
    axisTickFormat: config.options?.axisTickFormat,
    labelOrientation: config.options?.yLabelOrientation
      ? {
          orientation: config.options.yLabelOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: config.options.yLabelOrientation.angle,
        }
      : undefined,
    axisLabelOrientation: yAxisTitleOrientation
      ? {
          orientation: yAxisTitleOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: yAxisTitleOrientation.angle,
        }
      : undefined,
    showTicks: resolvedY.ticks,
    showTickLabels: resolvedY.tickLabels,
    showAxis: resolvedY.axisLine,
  }

  const rightAxisConfig: AxisConfig | undefined = config.options?.yAxisRight
    ? (() => {
        const resolved = resolveAxisVisibility(
          config.options.yAxisRight.axisVisibility,
          globalVisibility
        )
        return {
          tickCount: config.options.yAxisRight.tickCount,
          axisLabel: config.options.yAxisRight.axisLabel,
          axisTickFormat:
            config.options.yAxisRight.axisTickFormat !== undefined
              ? config.options.yAxisRight.axisTickFormat
              : config.options?.axisTickFormat,
          labelOrientation: config.options.yAxisRight.labelOrientation
            ? {
                orientation: config.options.yAxisRight.labelOrientation
                  .orientation as LabelOrientation | undefined,
                angle: config.options.yAxisRight.labelOrientation.angle,
              }
            : undefined,
          axisLabelOrientation: config.options.yAxisRight.labelOrientation
            ? {
                orientation: config.options.yAxisRight.labelOrientation
                  .orientation as LabelOrientation | undefined,
                angle: config.options.yAxisRight.labelOrientation.angle,
              }
            : config.options.yAxisRight.axisLabel
              ? { orientation: LabelOrientation.VERTICAL }
              : undefined,
          showTicks: resolved.ticks,
          showTickLabels: resolved.tickLabels,
          showAxis: resolved.axisLine,
        }
      })()
    : undefined

  const isRightOnly =
    config.options?.yAxis?.position === 'right' && config.options?.yAxisRight
  const layoutYAxis: AxisConfig | null = isRightOnly ? null : leftAxisConfig

  const { plotRect, scales, axes, xDomain, yDomain, yDomainLeft, yDomainRight } =
    computeCartesianLayout(config.series, size, env.measureText, {
      padding,
      xAxis: bottomAxisConfig,
      yAxis: layoutYAxis,
      yAxisRight: rightAxisConfig,
      yAxisRightDomain: config.options?.yAxisRight?.domain,
      enableAdaptivePadding: config.options?.enableAdaptivePadding ?? true,
      axisTickFont: config.options?.axisTickFont,
      axisLabelFont: config.options?.axisLabelFont,
    })

  const isDualScale = scales.yLeft !== undefined && scales.yRight !== undefined
  const getYScale = (series: LineSeries): (v: number) => number =>
    isDualScale && series.yAxis === 'right' ? scales.yRight! : scales.y

  const children: SceneNode[] = []

  // background (optional)
  children.push({
    kind: SceneNodeKind.RECT,
    id: 'background',
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    style: { fill: { type: 'solid', color: 'transparent' } },
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
      false, // isYAxis
      xAxisHasZero, // hideLabelAtIntersection
      bottomAxisConfig // axisConfig
    )
  )
  if (axes.y !== undefined) {
    children.push(
      ...axisToSceneNodes(
        axes.y,
        plotRect,
        config.options?.axisTickFont,
        config.options?.axisLabelFont,
        true, // isYAxis
        xAxisHasZero, // hideLabelAtIntersection
        leftAxisConfig // axisConfig
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
        true, // isYAxis
        xAxisHasZero, // hideLabelAtIntersection
        rightAxisConfig // axisConfig
      )
    )
  }

  // line paths and optional points
  const pointsEnabled = config.options?.showPoints ?? false

  for (const series of config.series) {
    // Normalize at boundary: config → scene is the ONLY place strings exist
    const paint = resolveSeriesPaint(series, pointsEnabled)
    const yScaleForSeries = getYScale(series)

    // Line path: uses paint.stroke for stroke, explicitly sets fill to none (lines don't fill unless area charts)
    // Use thicker stroke for gradients to make them visible
    const strokePaint = paint.stroke ?? DEFAULT_SOLID_CURRENT_COLOR
    const isGradient =
      strokePaint.type === 'linear' || strokePaint.type === 'radial'
    children.push({
      kind: SceneNodeKind.PATH,
      id: `series:${series.id}`,
      d: buildLinePathD(series.points, scales.x, yScaleForSeries),
      style: {
        fill: TRANSPARENT_FILL, // Explicitly set to none to prevent SVG default black fill
        stroke: strokePaint,
        strokeWidth: isGradient ? 4 : 2, // Thicker for gradients
      },
    })

    // Points: intent only (domain x,y + shape/size). Renderer realizes geometry.
    if (pointsEnabled) {
      const pointConfig = resolvePointConfig(
        series.point,
        config.options?.point
      )
      series.points.forEach((pt, index) => {
        if (pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x))
          return
        let pointFill = paint.fill
        if (!pointFill && paint.stroke) {
          if (paint.stroke.type === 'solid') {
            pointFill = paint.stroke
          } else if (
            paint.stroke.type === 'linear' ||
            paint.stroke.type === 'radial'
          ) {
            try {
              const normalized = normalizeGradientPaint(paint.stroke)
              const firstStop = normalized.stops[0]
              if (firstStop) {
                pointFill = { type: 'solid', color: firstStop.color }
              }
            } catch {
              // fall through
            }
          }
        }
        pointFill = pointFill ?? DEFAULT_SOLID_CURRENT_COLOR

        children.push({
          kind: SceneNodeKind.POINT,
          id: `point:${series.id}:${index}`,
          seriesId: series.id,
          x: pt.x,
          y: pt.y,
          point: { shape: pointConfig.shape, size: pointConfig.size },
          style: { fill: pointFill },
          metadata: {
            tooltip: createSceneTooltip(
              TooltipKind.POINT,
              [{ seriesId: series.id, x: pt.x, y: pt.y }],
              {}
            ),
          },
        })
      })
    }
  }

  const seriesPayload = config.series.map((s): HoverSeries => {
    const validPoints = s.points
      .filter(
        p =>
          p.y !== null && Number.isFinite(p.x) && Number.isFinite(p.y)
      )
      .map(p => ({ x: p.x, y: p.y! }))
      .sort((a, b) => a.x - b.x)
    const sortedPoints = Object.freeze(validPoints)
    return {
      id: s.id,
      yAxis: isDualScale ? (s.yAxis ?? 'left') : 'left',
      sortedPoints,
    }
  })

  const hover = isDualScale
    ? {
        xInvert: scales.xInvert,
        scales: {
          x: scales.x,
          yLeft: scales.yLeft!,
          yRight: scales.yRight!,
        },
        yInvertLeft: scales.yInvertLeft!,
        yInvertRight: scales.yInvertRight!,
        yDomainLeft: yDomainLeft!,
        yDomainRight: yDomainRight!,
        plotRect,
        xDomain,
        series: seriesPayload,
      }
    : {
        xInvert: scales.xInvert,
        yInvert: scales.yInvert,
        scales: { x: scales.x, y: scales.y },
        plotRect,
        xDomain,
        yDomain,
        series: seriesPayload,
      }

  return {
    scene: {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children,
      metadata: { hover },
    },
  }
}
