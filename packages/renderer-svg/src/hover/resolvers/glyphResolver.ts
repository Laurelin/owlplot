import type { HoverResolutionResult } from '../types'
import type { ExtendedSVGElement } from '../../shared/extendedElements'
import { TOOLTIP_DATUM_SYMBOL } from '../../shared/symbols'
import { DataAttributeName } from '../../shared/enums'

/**
 * Resolve glyph hover from an event target element.
 * GLYPH mode uses event delegation (not data-driven resolvers).
 * Reads domain coordinates from data attributes first, falls back to tooltip datum if available.
 * Returns 'none' if no domain coords available (scales may not be invertible).
 */
export function resolveGlyphFromElement(
  element: Element | null,
  _metadata: { scales: { x: (v: number) => number; y: (v: number) => number } }
): HoverResolutionResult {
  if (!element) return { kind: 'none' }

  const extendedEl = element as ExtendedSVGElement
  const tooltipDatum = extendedEl[TOOLTIP_DATUM_SYMBOL]
  if (!tooltipDatum) return { kind: 'none' }

  // Extract domain coordinates from data attributes first
  const domainXStr = element.getAttribute(`data-${DataAttributeName.OWLPLOT_X}`)
  const domainYStr = element.getAttribute(`data-${DataAttributeName.OWLPLOT_Y}`)

  let domainX: number | null = null
  let domainY: number | null = null

  if (domainXStr && domainYStr) {
    domainX = parseFloat(domainXStr)
    domainY = parseFloat(domainYStr)
  } else if (tooltipDatum.values.x && tooltipDatum.values.y) {
    // Fallback: check if tooltip datum already includes domain coords
    const x = tooltipDatum.values.x
    const y = tooltipDatum.values.y
    if (typeof x === 'number' && typeof y === 'number') {
      domainX = x
      domainY = y
    }
  }

  // If no domain coords available, return none (do NOT convert via scales)
  // Scales may not be invertible (band scales, clamped transforms)
  if (
    domainX === null ||
    domainY === null ||
    !Number.isFinite(domainX) ||
    !Number.isFinite(domainY)
  ) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[owlplot] Glyph hover: no domain coordinates available, cannot resolve hover'
      )
    }
    return { kind: 'none' }
  }

  const seriesId = tooltipDatum.seriesId || 'unknown'

  return {
    kind: 'points',
    points: [{ seriesId, point: { x: domainX, y: domainY } }],
    primaryIndex: 0,
  }
}
