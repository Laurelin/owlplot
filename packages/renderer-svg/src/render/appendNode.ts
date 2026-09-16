import type { SceneNode } from '@owlplot/core'
import { SceneNodeKind, TooltipKind } from '@owlplot/core'
import { createSvgElement } from './svgDom'
import { setStyle } from './setStyle'
import { ExtendedSVGElement } from '../shared/extendedElements'
import { TOOLTIP_DATUM_SYMBOL } from '../shared/symbols'
import { SvgAttributeName } from '../shared/enums'
import {
  DATA_SERIES_ID,
  DATA_POINT_INDEX,
  DATA_X,
  DATA_Y,
} from '../shared/dataAttributes'
import { serializeSceneTransform } from '../shared/sceneTransform'
import {
  realizePointNode,
  isDualScale,
  type PointRenderContext,
  type HoverScales,
} from './realizePoint'

export type { HoverScales, PointRenderContext }
export { isDualScale }
export type AppendNodeContext = PointRenderContext

function setAttributes(
  el: SVGElement,
  attributes: Readonly<Record<string, string | number>>
): void {
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, String(value))
  }
}

type StampableNode = {
  id: string
  metadata?: {
    tooltip?: {
      kind: TooltipKind
      seriesId?: string
      points: { x: number; y: number }[]
    }
  }
}

function resolvePointTooltip(node: StampableNode) {
  const datum = node.metadata?.tooltip
  if (datum?.kind !== TooltipKind.POINT || !datum.seriesId) return undefined
  return { seriesId: datum.seriesId, points: datum.points }
}

function stampPrimaryPoint(
  el: SVGElement,
  point: { x: number; y: number } | undefined
): void {
  if (!point) return
  el.setAttribute(DATA_X, String(point.x))
  el.setAttribute(DATA_Y, String(point.y))
}

function stampPointIndex(el: SVGElement, nodeId: string): void {
  const pointIndex = nodeId.match(/^point:[^:]+:(\d+)$/)?.[1]
  if (pointIndex != null) el.setAttribute(DATA_POINT_INDEX, pointIndex)
}

function stampPointDataAttributes(el: SVGElement, node: StampableNode): void {
  const datum = resolvePointTooltip(node)
  if (!datum) return
  el.setAttribute(DATA_SERIES_ID, datum.seriesId)
  stampPrimaryPoint(el, datum.points[0])
  stampPointIndex(el, node.id)
}

function createGroupElement(node: Extract<SceneNode, { kind: 'group' }>) {
  const el = createSvgElement('g')
  const serializedTransform = serializeSceneTransform(node.transform)
  if (serializedTransform) {
    el.setAttribute(SvgAttributeName.TRANSFORM, serializedTransform)
  }
  return el
}

function createTextElement(node: Extract<SceneNode, { kind: 'text' }>) {
  const el = createSvgElement('text')
  setAttributes(el, { x: node.x, y: node.y })
  el.textContent = node.text
  if (node.textAnchor) {
    el.setAttribute(SvgAttributeName.TEXT_ANCHOR, node.textAnchor)
  }
  if (node.dominantBaseline) {
    el.setAttribute(SvgAttributeName.DOMINANT_BASELINE, node.dominantBaseline)
  }
  const serializedTransform = serializeSceneTransform(node.transform)
  if (serializedTransform) {
    el.setAttribute(SvgAttributeName.TRANSFORM, serializedTransform)
  }
  return el
}

function warnMissingPointContext(): void {
  if (process.env.NODE_ENV === 'production') return
  console.warn(
    '[owlplot] ScenePointNode requires render context with scales and seriesYAxis; skipping point.'
  )
}

function createRealizedPointElement(
  realized: ReturnType<typeof realizePointNode>
): SVGElement | null {
  if (!realized) return null
  const el = createSvgElement(realized.tag)
  switch (realized.tag) {
    case 'circle':
      setAttributes(el, { cx: realized.cx, cy: realized.cy, r: realized.r })
      break
    case 'rect':
      setAttributes(el, {
        x: realized.x,
        y: realized.y,
        width: realized.width,
        height: realized.height,
      })
      break
    case 'path':
      setAttributes(el, {
        d: realized.d,
        transform: realized.transform,
      })
      break
    case 'text':
      setAttributes(el, {
        x: realized.x,
        y: realized.y,
        [SvgAttributeName.TEXT_ANCHOR]: realized.textAnchor,
        [SvgAttributeName.DOMINANT_BASELINE]: realized.dominantBaseline,
        [SvgAttributeName.FONT_SIZE]: realized.fontSize,
      })
      el.textContent = realized.text
      break
  }
  return el
}

function createPointElement(
  node: Extract<SceneNode, { kind: 'point' }>,
  context?: AppendNodeContext
): SVGElement | null {
  if (!context?.scales || !context.seriesYAxis) {
    warnMissingPointContext()
    return null
  }
  const el = createRealizedPointElement(realizePointNode(node, context))
  if (el) stampPointDataAttributes(el, node)
  return el
}

function createBasicNodeElement(node: SceneNode): SVGElement | null {
  switch (node.kind) {
    case SceneNodeKind.GROUP:
      return createGroupElement(node)
    case SceneNodeKind.PATH: {
      const el = createSvgElement('path')
      el.setAttribute(SvgAttributeName.D, node.d)
      return el
    }
    case SceneNodeKind.RECT: {
      const el = createSvgElement('rect')
      setAttributes(el, {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      })
      return el
    }
    case SceneNodeKind.CIRCLE: {
      const el = createSvgElement('circle')
      setAttributes(el, { cx: node.cx, cy: node.cy, r: node.r })
      stampPointDataAttributes(el, node)
      return el
    }
    default:
      return null
  }
}

function createNodeElement(
  node: SceneNode,
  context?: AppendNodeContext
): SVGElement | null {
  if (node.kind === SceneNodeKind.POINT)
    return createPointElement(node, context)
  if (node.kind === SceneNodeKind.TEXT) return createTextElement(node)
  return createBasicNodeElement(node)
}

function resolveRootSvg(
  parent: SVGElement,
  svg?: SVGSVGElement
): SVGSVGElement | undefined {
  if (svg) return svg
  return parent instanceof SVGSVGElement ? parent : undefined
}

function appendGroupChildren(
  node: Extract<SceneNode, { kind: 'group' }>,
  el: SVGElement,
  rootSvg: SVGSVGElement | undefined,
  context?: AppendNodeContext
): void {
  for (const child of node.children) {
    appendNode(child, el, rootSvg, context)
  }
}

export function appendNode(
  node: SceneNode,
  parent: SVGElement,
  svg?: SVGSVGElement,
  context?: AppendNodeContext
) {
  const el = createNodeElement(node, context)
  if (!el) return
  const rootSvg = resolveRootSvg(parent, svg)
  if (node.kind === SceneNodeKind.GROUP) {
    appendGroupChildren(node, el, rootSvg, context)
  }
  el.setAttribute(SvgAttributeName.ID, node.id)
  setStyle(el, node.style, rootSvg)
  if (node.metadata?.tooltip) {
    ;(el as ExtendedSVGElement)[TOOLTIP_DATUM_SYMBOL] = node.metadata.tooltip
  }
  parent.appendChild(el)
}
