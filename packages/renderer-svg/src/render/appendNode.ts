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
import { buildTrianglePath, buildDiamondPath } from './pointShapePaths'

type Scale = (v: number) => number

/** Single-scale: one y. Dual-scale: yLeft and yRight. No mixing. */
export type HoverScales =
  | { x: Scale; y: Scale }
  | { x: Scale; yLeft: Scale; yRight: Scale }

export function isDualScale(
  scales: HoverScales
): scales is { x: Scale; yLeft: Scale; yRight: Scale } {
  return 'yLeft' in scales
}

/** Render context: scales + series→axis map. Scale resolution by seriesId only. */
export type AppendNodeContext = {
  scales: HoverScales
  seriesYAxis: Record<string, 'left' | 'right'>
}

function getYScaleForSeries(
  seriesId: string,
  ctx: AppendNodeContext
): (v: number) => number {
  const side = ctx.seriesYAxis[seriesId] ?? 'left'
  if (isDualScale(ctx.scales)) {
    return side === 'right' ? ctx.scales.yRight : ctx.scales.yLeft
  }
  return ctx.scales.y
}

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
      if (node.transform)
        el.setAttribute(SvgAttributeName.TRANSFORM, node.transform)
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
      const seriesId = (node as unknown as { seriesId: string }).seriesId
      if (seriesId == null && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[owlplot] ScenePointNode requires seriesId; skipping point.'
        )
        break
      }
      const cx = context.scales.x(node.x)
      const yScale = getYScaleForSeries(seriesId, context)
      const cy = yScale(node.y)
      const size = node.point.size
      const shape = node.point.shape

      if (shape.kind === 'circle') {
        el = createSvgElement('circle')
        el.setAttribute(SvgAttributeName.CX, String(cx))
        el.setAttribute(SvgAttributeName.CY, String(cy))
        el.setAttribute(SvgAttributeName.R, String(size))
      } else if (shape.kind === 'square') {
        // Circumradius = size => half-diagonal = size => side = size * sqrt(2)
        const halfSide = size * Math.SQRT1_2
        el = createSvgElement('rect')
        el.setAttribute(SvgAttributeName.X, String(cx - halfSide))
        el.setAttribute(SvgAttributeName.Y, String(cy - halfSide))
        el.setAttribute('width', String(2 * halfSide))
        el.setAttribute('height', String(2 * halfSide))
      } else if (shape.kind === 'triangle') {
        el = createSvgElement('path')
        el.setAttribute(SvgAttributeName.D, buildTrianglePath(size))
        el.setAttribute(SvgAttributeName.TRANSFORM, `translate(${cx},${cy})`)
      } else if (shape.kind === 'diamond') {
        el = createSvgElement('path')
        el.setAttribute(SvgAttributeName.D, buildDiamondPath(size))
        el.setAttribute(SvgAttributeName.TRANSFORM, `translate(${cx},${cy})`)
      } else if (shape.kind === 'symbol') {
        // No registry yet; fall back to circle
        el = createSvgElement('circle')
        el.setAttribute(SvgAttributeName.CX, String(cx))
        el.setAttribute(SvgAttributeName.CY, String(cy))
        el.setAttribute(SvgAttributeName.R, String(size))
      } else if (shape.kind === 'emoji') {
        el = createSvgElement('text')
        el.setAttribute(SvgAttributeName.X, String(cx))
        el.setAttribute(SvgAttributeName.Y, String(cy))
        el.setAttribute(SvgAttributeName.TEXT_ANCHOR, 'middle')
        el.setAttribute(SvgAttributeName.DOMINANT_BASELINE, 'central')
        el.setAttribute(
          SvgAttributeName.FONT_SIZE,
          String(Math.round(size * 2))
        )
        el.textContent = shape.value
      } else {
        el = createSvgElement('circle')
        el.setAttribute(SvgAttributeName.CX, String(cx))
        el.setAttribute(SvgAttributeName.CY, String(cy))
        el.setAttribute(SvgAttributeName.R, String(size))
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
      if (node.transform) {
        el.setAttribute(SvgAttributeName.TRANSFORM, node.transform)
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
