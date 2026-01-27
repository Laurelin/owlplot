import type { SceneNode } from '@owlplot/core'
import { SceneNodeKind } from '@owlplot/core'
import { createSvgElement } from './svgDom'
import { setStyle } from './setStyle'
import { ExtendedSVGElement } from '../shared/extendedElements'
import { TOOLTIP_DATUM_SYMBOL } from '../shared/symbols'
import {
  SvgAttributeName,
  DataAttributeName,
  TooltipKind,
} from '../shared/enums'

export function appendNode(
  node: SceneNode,
  parent: SVGElement,
  svg?: SVGSVGElement
) {
  let el: SVGElement | null = null

  switch (node.kind) {
    case SceneNodeKind.GROUP: {
      el = createSvgElement('g')
      if (node.transform)
        el.setAttribute(SvgAttributeName.TRANSFORM, node.transform)
      // Pass svg down for gradient defs
      const rootSvg = svg ?? (parent instanceof SVGSVGElement ? parent : undefined)
      node.children.forEach((child: SceneNode) =>
        appendNode(child, el!, rootSvg)
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

      // Stamp domain coordinates as data attributes (future-proof for non-linear scales)
      if (node.metadata?.tooltip) {
        const datum = node.metadata.tooltip
        if (datum.kind === TooltipKind.POINT && datum.seriesId) {
          const circleEl = el as SVGCircleElement
          circleEl.dataset[DataAttributeName.OWLPLOT_SERIES_ID] = datum.seriesId
          if (typeof datum.values.x === 'number') {
            circleEl.dataset[DataAttributeName.OWLPLOT_X] = String(
              datum.values.x
            )
          }
          if (typeof datum.values.y === 'number') {
            circleEl.dataset[DataAttributeName.OWLPLOT_Y] = String(
              datum.values.y
            )
          }
        }
      }
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d448ec8c-8a29-4eb0-9ef7-cfbc4bb143f4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'appendNode.ts:86',message:'TEXT node transform applied',data:{id:node.id,transform:node.transform,text:node.text},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
      }
      break
    }
  }

  if (!el) return
  el.setAttribute(SvgAttributeName.ID, node.id)
  // Get root SVG for gradient defs (if parent is SVG, use it; otherwise use passed svg)
  const rootSvg =
    svg ?? (parent instanceof SVGSVGElement ? parent : undefined)
  setStyle(el, node.style, rootSvg)

  // Store tooltip datum on element if present
  if (node.metadata?.tooltip) {
    ;(el as ExtendedSVGElement)[TOOLTIP_DATUM_SYMBOL] = node.metadata.tooltip
  }

  parent.appendChild(el)
}
