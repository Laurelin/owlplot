import { Position } from '../../config/types'
import {
  SceneNodeKind,
  type SceneNode,
  type SceneTransform,
} from '../../scene/types'
import type { AxisConfig } from '../cartesian2d/axis'
import { DEFAULT_LABEL_FONT, DEFAULT_TICK_FONT } from '../cartesian2d/axis'
import { type AxisLayout } from '../cartesian2d/types/axis'
import { DEFAULT_SOLID_CURRENT_COLOR } from '../../paint/helpers'

/** Epsilon for "value is zero" checks. */
const ZERO_EPSILON = 1e-10

function extractFontSizePx(fontString: string): number {
  const match = /(\d+(?:\.\d+)?)(pt|px)/i.exec(fontString)
  if (!match) return 10
  const size = Number(match[1])
  const unit = match[2]!.toLowerCase()
  return unit === 'pt' ? size * (4 / 3) : size
}

function resolveAxisTransform(
  orientation: AxisLayout['orientation'],
  plotRect: { x: number; y: number; width: number; height: number }
): SceneTransform {
  switch (orientation) {
    case Position.BOTTOM:
      return {
        kind: 'translate',
        x: plotRect.x,
        y: plotRect.y + plotRect.height,
      }
    case Position.RIGHT:
      return {
        kind: 'translate',
        x: plotRect.x + plotRect.width,
        y: plotRect.y,
      }
    default:
      return { kind: 'translate', x: plotRect.x, y: plotRect.y }
  }
}

function buildAxisLineNode(axis: AxisLayout): SceneNode {
  return {
    kind: SceneNodeKind.PATH,
    id: `axis-line:${axis.orientation}`,
    d: `M ${axis.line.x1} ${axis.line.y1} L ${axis.line.x2} ${axis.line.y2}`,
    style: { stroke: DEFAULT_SOLID_CURRENT_COLOR, strokeWidth: 1 },
  }
}

function buildTickLineNode(
  axis: AxisLayout,
  index: number,
  position: number
): SceneNode {
  const isHorizontal =
    axis.orientation === Position.BOTTOM || axis.orientation === Position.TOP
  const start: [number, number] = isHorizontal
    ? [position, axis.line.y1]
    : [axis.line.x1, position]
  const end: [number, number] = isHorizontal
    ? [
        position,
        axis.orientation === Position.BOTTOM
          ? axis.line.y1 + axis.tickSize
          : axis.line.y1 - axis.tickSize,
      ]
    : [axis.line.x1 - axis.tickSize, position]
  return {
    kind: SceneNodeKind.PATH,
    id: `axis-tick:${axis.orientation}:${index}`,
    d: `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`,
    style: { stroke: DEFAULT_SOLID_CURRENT_COLOR, strokeWidth: 1 },
  }
}

function resolveRotationTransform(layout: {
  rotation?: number
  x: number
  y: number
}): SceneTransform | undefined {
  if (layout.rotation === undefined) return undefined
  return {
    kind: 'rotate',
    degrees: layout.rotation,
    originX: layout.x,
    originY: layout.y,
  }
}

function buildTickLabelNode(
  axis: AxisLayout,
  index: number,
  tickFont: string | undefined
): SceneNode | undefined {
  const label = axis.labelLayouts[index]
  if (!label || label.text === '') return undefined
  return {
    kind: SceneNodeKind.TEXT,
    id: `axis-tick-label:${axis.orientation}:${index}`,
    x: label.x,
    y: label.y,
    text: label.text,
    textAnchor: label.textAnchor,
    dominantBaseline: label.dominantBaseline,
    transform: resolveRotationTransform(label),
    style: {
      fill: DEFAULT_SOLID_CURRENT_COLOR,
      fontSizePx: extractFontSizePx(tickFont ?? DEFAULT_TICK_FONT),
    },
  }
}

function buildTickNodes(
  axis: AxisLayout,
  index: number,
  tickFont: string | undefined,
  visibility: { ticks: boolean; labels: boolean }
): SceneNode[] {
  const nodes: SceneNode[] = []
  const tick = axis.ticks[index]!
  if (visibility.ticks)
    nodes.push(buildTickLineNode(axis, index, tick.position))
  const label = visibility.labels
    ? buildTickLabelNode(axis, index, tickFont)
    : undefined
  if (label) nodes.push(label)
  return nodes
}

function buildAxisLabelNode(
  axis: AxisLayout,
  labelFont: string | undefined
): SceneNode | undefined {
  const label = axis.axisLabelLayout
  if (!label) return undefined
  return {
    kind: SceneNodeKind.TEXT,
    id: `axis-label:${axis.orientation}`,
    x: label.x,
    y: label.y,
    text: label.text,
    textAnchor: label.textAnchor,
    dominantBaseline: label.dominantBaseline,
    transform: resolveRotationTransform(label),
    style: {
      fill: DEFAULT_SOLID_CURRENT_COLOR,
      fontSizePx: extractFontSizePx(labelFont ?? DEFAULT_LABEL_FONT),
    },
  }
}

function isVisibleTick(value: number, hideTickAtOrigin: boolean): boolean {
  return !hideTickAtOrigin || Math.abs(value) >= ZERO_EPSILON
}

function optionalNode(node: SceneNode | undefined): SceneNode[] {
  return node ? [node] : []
}

function buildVisibleAxisLine(
  axis: AxisLayout,
  showAxis: boolean
): SceneNode[] {
  return showAxis ? [buildAxisLineNode(axis)] : []
}

export function axisToSceneNodes(
  axis: AxisLayout,
  plotRect: { x: number; y: number; width: number; height: number },
  tickFont?: string,
  labelFont?: string,
  hideTickAtOrigin = false,
  axisConfig?: AxisConfig
): SceneNode[] {
  const showTicks = axisConfig?.showTicks !== false
  const showTickLabels = axisConfig?.showTickLabels !== false
  const showAxis = axisConfig?.showAxis !== false
  const children = buildVisibleAxisLine(axis, showAxis)
  axis.ticks.forEach((tick, i) => {
    if (!isVisibleTick(tick.value, hideTickAtOrigin)) return
    children.push(
      ...buildTickNodes(axis, i, tickFont, {
        ticks: showTicks,
        labels: showTickLabels,
      })
    )
  })
  children.push(...optionalNode(buildAxisLabelNode(axis, labelFont)))

  return [
    {
      kind: SceneNodeKind.GROUP,
      id: `axis-group:${axis.orientation}`,
      transform: resolveAxisTransform(axis.orientation, plotRect),
      children,
    },
  ]
}
