import {
  ExtendedSVGElement,
  ExtendedSVGSVGElement,
  type NodeHoverListenerRef,
} from '../shared/extendedElements'
import {
  TOOLTIP_DATUM_SYMBOL,
  NODE_HOVER_LISTENERS_SYMBOL,
} from '../shared/symbols'
import type { TooltipRenderer } from '../tooltip/types'
import {
  hideTooltip,
  showTooltip,
  updateTooltipPosition,
} from '../tooltip/tooltipDom'

export function removeNodeHoverListeners(svg: SVGSVGElement) {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const listeners = extendedSvg[NODE_HOVER_LISTENERS_SYMBOL]
  if (!listeners) return

  for (const { element, handlers } of listeners) {
    element.removeEventListener('mouseenter', handlers.mouseenter)
    element.removeEventListener('mousemove', handlers.mousemove)
    element.removeEventListener('mouseleave', handlers.mouseleave)
  }

  extendedSvg[NODE_HOVER_LISTENERS_SYMBOL] = undefined
}

export function attachNodeHoverListeners(
  svg: SVGSVGElement,
  renderer: TooltipRenderer
) {
  removeNodeHoverListeners(svg)

  const allNodes = svg.querySelectorAll('*')
  const listenerRefs: NodeHoverListenerRef[] = []

  allNodes.forEach(node => {
    const svgNode = node as ExtendedSVGElement
    const datum = svgNode[TOOLTIP_DATUM_SYMBOL]
    if (!datum) return

    const handleMouseEnter = (event: MouseEvent) =>
      showTooltip(datum, event, svg, renderer)
    const handleMouseMove = (event: MouseEvent) =>
      updateTooltipPosition(event, svg)
    const handleMouseLeave = () => hideTooltip(svg)

    svgNode.addEventListener('mouseenter', handleMouseEnter)
    svgNode.addEventListener('mousemove', handleMouseMove)
    svgNode.addEventListener('mouseleave', handleMouseLeave)

    listenerRefs.push({
      element: svgNode,
      handlers: {
        mouseenter: handleMouseEnter,
        mousemove: handleMouseMove,
        mouseleave: handleMouseLeave,
      },
    })
  })
  ;(svg as ExtendedSVGSVGElement)[NODE_HOVER_LISTENERS_SYMBOL] = listenerRefs
}
