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

function stampPointDataAttributes(
  el: SVGElement,
  node: {
    id: string
    metadata?: {
      tooltip?: {
        kind: TooltipKind
        seriesId?: string
        points: { x: number; y: number }[]
      }
    }
  }
): void {
  if (!node.metadata?.tooltip) return
  const datum = node.metadata.tooltip
  if (datum.kind !== TooltipKind.POINT || !datum.seriesId) return
  el.setAttribute(DATA_SERIES_ID, datum.seriesId)
  const primaryPoint = datum.points[0]
  if (primaryPoint) {
    el.setAttribute(DATA_X, String(primaryPoint.x))
    el.setAttribute(DATA_Y, String(primaryPoint.y))
  }
  const pointIndexMatch = node.id.match(/^point:[^:]+:(\d+)$/)
  if (pointIndexMatch?.[1] != null) {
    el.setAttribute(DATA_POINT_INDEX, pointIndexMatch[1])
  }
}

export function appendNode(
  node: SceneNode,
  parent: SVGElement,
  svg?: SVGSVGElement,
  context?: AppendNodeContext
) {
  let el: SVGElement | null = null

  switch (node.kind) {
    case SceneNodeKind.GROUP: {
      el = createSvgElement('g')
      const serializedTransform = serializeSceneTransform(node.transform)
      if (serializedTransform) {
        el.setAttribute(SvgAttributeName.TRANSFORM, serializedTransform)
      }
      const rootSvg =
        svg ?? (parent instanceof SVGSVGElement ? parent : undefined)
      node.children.forEach((child: SceneNode) =>
        appendNode(child, el!, rootSvg, context)
      )
      break
    }
    case SceneNodeKind.PATH: {
      el = createSvgElement('path')
      el.setAttribute(SvgAttributeName.D, node.d)
      break
    }
    case SceneNodeKind.RECT: {
      el = createSvgElement('rect')
      el.setAttribute(SvgAttributeName.X, String(node.x))
      el.setAttribute(SvgAttributeName.Y, String(node.y))
      el.setAttribute('width', String(node.width))
      el.setAttribute('height', String(node.height))
      break
    }
    case SceneNodeKind.CIRCLE: {
      el = createSvgElement('circle')
      el.setAttribute(SvgAttributeName.CX, String(node.cx))
      el.setAttribute(SvgAttributeName.CY, String(node.cy))
      el.setAttribute(SvgAttributeName.R, String(node.r))
      stampPointDataAttributes(el, node)
      break
    }
    case SceneNodeKind.POINT: {
      if (!context?.scales || !context.seriesYAxis) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[owlplot] ScenePointNode requires render context with scales and seriesYAxis; skipping point.'
          )
        }
        break
      }
      const realized = realizePointNode(node, context)
      if (!realized) break
      if (realized.tag === 'circle') {
        el = createSvgElement('circle')
        el.setAttribute(SvgAttributeName.CX, String(realized.cx))
        el.setAttribute(SvgAttributeName.CY, String(realized.cy))
        el.setAttribute(SvgAttributeName.R, String(realized.r))
      } else if (realized.tag === 'rect') {
        el = createSvgElement('rect')
        el.setAttribute(SvgAttributeName.X, String(realized.x))
        el.setAttribute(SvgAttributeName.Y, String(realized.y))
        el.setAttribute('width', String(realized.width))
        el.setAttribute('height', String(realized.height))
      } else if (realized.tag === 'path') {
        el = createSvgElement('path')
        el.setAttribute(SvgAttributeName.D, realized.d)
        el.setAttribute(SvgAttributeName.TRANSFORM, realized.transform)
      } else {
        el = createSvgElement('text')
        el.setAttribute(SvgAttributeName.X, String(realized.x))
        el.setAttribute(SvgAttributeName.Y, String(realized.y))
        el.setAttribute(SvgAttributeName.TEXT_ANCHOR, realized.textAnchor)
        el.setAttribute(
          SvgAttributeName.DOMINANT_BASELINE,
          realized.dominantBaseline
        )
        el.setAttribute(SvgAttributeName.FONT_SIZE, String(realized.fontSize))
        el.textContent = realized.text
      }
      if (el) stampPointDataAttributes(el, node)
      break
    }
    case SceneNodeKind.TEXT: {
      el = createSvgElement('text')
      el.setAttribute(SvgAttributeName.X, String(node.x))
      el.setAttribute(SvgAttributeName.Y, String(node.y))
      el.textContent = node.text
      if (node.textAnchor)
        el.setAttribute(SvgAttributeName.TEXT_ANCHOR, node.textAnchor)
      if (node.dominantBaseline)
        el.setAttribute(
          SvgAttributeName.DOMINANT_BASELINE,
          node.dominantBaseline
        )
      const serializedTransform = serializeSceneTransform(node.transform)
      if (serializedTransform) {
        el.setAttribute(SvgAttributeName.TRANSFORM, serializedTransform)
      }
      break
    }
  }

  if (!el) return
  el.setAttribute(SvgAttributeName.ID, node.id)
  // Get root SVG for gradient defs (if parent is SVG, use it; otherwise use passed svg)
  const rootSvg = svg ?? (parent instanceof SVGSVGElement ? parent : undefined)
  setStyle(el, node.style, rootSvg)

  // Store tooltip datum on element if present
  if (node.metadata?.tooltip) {
    ;(el as ExtendedSVGElement)[TOOLTIP_DATUM_SYMBOL] = node.metadata.tooltip
  }

  parent.appendChild(el)
}
