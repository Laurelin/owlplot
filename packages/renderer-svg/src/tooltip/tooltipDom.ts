import type { TooltipDatum } from '@owlplot/core'
import type { TooltipRenderer } from './types'
import type { HoverResolutionResult } from '../hover/types'
import { TooltipKind } from '../shared/enums'
import { calculateTooltipPosition } from './tooltipPosition'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  TOOLTIP_CONTAINER_SYMBOL,
  TOOLTIP_ELEMENT_SYMBOL,
  TOOLTIP_RENDERER_SYMBOL,
} from '../shared/symbols'
import { ContainerId } from '../shared/enums'

/**
 * Convert HoverResolutionResult to TooltipDatum.
 * Keeps TooltipDatum API stable while using new resolution system.
 */
function toTooltipDatum(result: HoverResolutionResult): TooltipDatum | null {
  if (result.kind === 'none') return null

  const primaryPoint = result.points[result.primaryIndex]
  if (!primaryPoint) return null

  const values: Record<string, unknown> = {}
  for (const { seriesId, point } of result.points) {
    values[seriesId] = point.y
  }

  // Determine tooltip kind based on number of points
  // X_AXIS/Y_AXIS typically have multiple points (one per series)
  // POINT/GLYPH typically have one point
  const kind = result.points.length > 1 ? TooltipKind.X_AXIS : TooltipKind.POINT

  // Include x coordinate in values for all modes (user wants x value in tooltip)
  values.x = primaryPoint.point.x

  return {
    kind,
    values,
    seriesId: primaryPoint.seriesId,
  }
}

function getOrCreateTooltipContainer(svg: SVGSVGElement): HTMLElement {
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

/**
 * Show tooltip from hover resolution result.
 * Uses adapter to convert result to TooltipDatum, keeping API stable.
 */
export function showTooltipFromResult(
  result: HoverResolutionResult,
  event: PointerEvent,
  svg: SVGSVGElement,
  renderer: TooltipRenderer
): void {
  const datum = toTooltipDatum(result)
  if (!datum) {
    hideTooltip(svg)
    return
  }

  // Use existing showTooltip (accepts MouseEvent, but PointerEvent is compatible)
  showTooltip(datum, event as MouseEvent, svg, renderer)
}
