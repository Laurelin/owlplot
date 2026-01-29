import type { HoverResolutionResult } from '../types'
import type { ExtendedSVGElement } from '../../shared/extendedElements'
import { TOOLTIP_DATUM_SYMBOL } from '../../shared/symbols'
import { DATA_X, DATA_Y } from '../../shared/dataAttributes'

// invariant: a glyph is only hoverable if it carries full domain metadata

/**
 * Resolve glyph hover from an event target element.
 * GLYPH mode uses event delegation (not data-driven resolvers).
 * Requires data-owlplot-x and data-owlplot-y; no inference from tooltip datum.
 */
export function resolveGlyphFromElement(
  element: Element | null,
  _metadata: { scales: { x: (v: number) => number; y: (v: number) => number } }
): HoverResolutionResult {
  if (!element) return { kind: 'none' }

  if (!element.hasAttribute(DATA_X) || !element.hasAttribute(DATA_Y)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[owlplot] Glyph hover: element missing data-owlplot-x or data-owlplot-y, cannot resolve'
      )
    }
    return { kind: 'none' }
  }

  const extendedEl = element as ExtendedSVGElement
  const tooltipDatum = extendedEl[TOOLTIP_DATUM_SYMBOL]
  if (!tooltipDatum) return { kind: 'none' }

  const domainXStr = element.getAttribute(DATA_X)
  const domainYStr = element.getAttribute(DATA_Y)
  const domainX = domainXStr != null ? parseFloat(domainXStr) : NaN
  const domainY = domainYStr != null ? parseFloat(domainYStr) : NaN

  if (
    !Number.isFinite(domainX) ||
    !Number.isFinite(domainY)
  ) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[owlplot] Glyph hover: invalid domain coordinates, cannot resolve hover'
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
