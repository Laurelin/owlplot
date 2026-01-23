import type { TooltipDatum } from '@owlplot/core'
import type { TooltipRenderer } from './types'
import { calculateTooltipPosition } from './tooltipPosition'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  TOOLTIP_CONTAINER_SYMBOL,
  TOOLTIP_ELEMENT_SYMBOL,
  TOOLTIP_RENDERER_SYMBOL,
} from '../shared/symbols'
import { ContainerId } from '../shared/enums'

export function getOrCreateTooltipContainer(svg: SVGSVGElement): HTMLElement {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const existing = extendedSvg[TOOLTIP_CONTAINER_SYMBOL]
  if (existing && document.body.contains(existing)) {
    return existing
  }

  const container = document.createElement('div')
  container.id = ContainerId.OWLPLOT_TOOLTIP
  container.style.position = 'absolute'
  container.style.pointerEvents = 'none'
  container.style.zIndex = '1000'
  container.style.display = 'none'
  document.body.appendChild(container)

  extendedSvg[TOOLTIP_CONTAINER_SYMBOL] = container
  return container
}

export function hideTooltip(svg: SVGSVGElement) {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const container = extendedSvg[TOOLTIP_CONTAINER_SYMBOL]
  const tooltipEl = extendedSvg[TOOLTIP_ELEMENT_SYMBOL]
  const renderer = extendedSvg[TOOLTIP_RENDERER_SYMBOL]

  if (container) container.style.display = 'none'
  if (tooltipEl && renderer?.destroy) renderer.destroy(tooltipEl)

  extendedSvg[TOOLTIP_ELEMENT_SYMBOL] = undefined
}

export function showTooltip(
  datum: TooltipDatum,
  event: MouseEvent,
  svg: SVGSVGElement,
  renderer: TooltipRenderer
) {
  if (!Object.keys(datum.values).length && !datum.label && !datum.seriesId)
    return

  hideTooltip(svg)

  const container = getOrCreateTooltipContainer(svg)
  const tooltipEl = renderer.render(datum)
  const extendedSvg = svg as ExtendedSVGSVGElement

  container.innerHTML = ''
  container.appendChild(tooltipEl)

  extendedSvg[TOOLTIP_ELEMENT_SYMBOL] = tooltipEl
  extendedSvg[TOOLTIP_RENDERER_SYMBOL] = renderer

  const { x, y } = calculateTooltipPosition(event, tooltipEl)
  container.style.left = `${x}px`
  container.style.top = `${y}px`
  container.style.display = 'block'
}

export function updateTooltipPosition(event: MouseEvent, svg: SVGSVGElement) {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const container = extendedSvg[TOOLTIP_CONTAINER_SYMBOL]
  const tooltipEl = extendedSvg[TOOLTIP_ELEMENT_SYMBOL]

  if (!container || !tooltipEl || container.style.display === 'none') return

  const { x, y } = calculateTooltipPosition(event, tooltipEl)
  container.style.left = `${x}px`
  container.style.top = `${y}px`
}
