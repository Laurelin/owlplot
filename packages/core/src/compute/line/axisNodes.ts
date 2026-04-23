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

function extractFontSizePx(fontString: string | undefined): number {
  if (!fontString) return 10
  const match = /(\d+(?:\.\d+)?)(pt|px)/i.exec(fontString)
  if (!match) return 10
  const size = Number(match[1])
  const unit = match[2]?.toLowerCase()
  if (!unit) return 10
  return unit === 'pt' ? size * (4 / 3) : size
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

  const isHorizontal =
    axis.orientation === Position.BOTTOM || axis.orientation === Position.TOP

  let tx = plotRect.x
  let ty = plotRect.y

  if (axis.orientation === Position.BOTTOM) {
    ty = plotRect.y + plotRect.height
  } else if (axis.orientation === Position.TOP) {
    ty = plotRect.y
  } else if (axis.orientation === Position.LEFT) {
    tx = plotRect.x
    ty = plotRect.y
  } else if (axis.orientation === Position.RIGHT) {
    tx = plotRect.x + plotRect.width
    ty = plotRect.y
  }

  const transform: SceneTransform = { kind: 'translate', x: tx, y: ty }
  const children: SceneNode[] = []

  if (showAxis) {
    children.push({
      kind: SceneNodeKind.PATH,
      id: `axis-line:${axis.orientation}`,
      d: `M ${axis.line.x1} ${axis.line.y1} L ${axis.line.x2} ${axis.line.y2}`,
      style: { stroke: DEFAULT_SOLID_CURRENT_COLOR, strokeWidth: 1 },
    })
  }

  axis.ticks.forEach((tick, i) => {
    const lbl = axis.labelLayouts[i]
    const isAtOrigin = hideTickAtOrigin && Math.abs(tick.value) < ZERO_EPSILON
    if (isAtOrigin) return

    if (showTicks) {
      let tickStart: [number, number]
      let tickEnd: [number, number]

      if (isHorizontal) {
        tickStart = [tick.position, axis.line.y1]
        tickEnd = [
          tick.position,
          axis.orientation === Position.BOTTOM
            ? axis.line.y1 + axis.tickSize
            : axis.line.y1 - axis.tickSize,
        ]
      } else {
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

    if (lbl && showTickLabels && lbl.text !== '') {
      const textTransform =
        lbl.rotation !== undefined
          ? ({
              kind: 'rotate',
              degrees: lbl.rotation,
              originX: lbl.x,
              originY: lbl.y,
            } satisfies SceneTransform)
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
        transform: textTransform,
        style: { fill: DEFAULT_SOLID_CURRENT_COLOR, fontSizePx },
      })
    }
  })

  if (axis.axisLabelLayout) {
    const al = axis.axisLabelLayout
    const fontSizePx = extractFontSizePx(labelFont ?? DEFAULT_LABEL_FONT)
    const textTransform =
      al.rotation !== undefined
        ? ({
            kind: 'rotate',
            degrees: al.rotation,
            originX: al.x,
            originY: al.y,
          } satisfies SceneTransform)
        : undefined
    children.push({
      kind: SceneNodeKind.TEXT,
      id: `axis-label:${axis.orientation}`,
      x: al.x,
      y: al.y,
      text: al.text,
      textAnchor: al.textAnchor,
      dominantBaseline: al.dominantBaseline,
      transform: textTransform,
      style: { fill: DEFAULT_SOLID_CURRENT_COLOR, fontSizePx },
    })
  }

  return [
    {
      kind: SceneNodeKind.GROUP,
      id: `axis-group:${axis.orientation}`,
      transform,
      children,
    },
  ]
}
