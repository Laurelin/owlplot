import type { HoverResolutionResult, RuntimeHoverMetadata } from '../types'
import type { ExtendedSVGElement } from '../../shared/extendedElements'
import { TOOLTIP_DATUM_SYMBOL } from '../../shared/symbols'
import { DATA_X, DATA_Y } from '../../shared/dataAttributes'
import { warnDev } from '../../shared/dev'

// invariant: a glyph is only hoverable if it carries full domain metadata

function warnGlyph(message: string): void {
  warnDev(`[owlplot] Glyph hover: ${message}`)
}

function hasDomainAttributes(element: Element): boolean {
  return element.hasAttribute(DATA_X) && element.hasAttribute(DATA_Y)
}

function readDomainPoint(element: Element): { x: number; y: number } | null {
  const x = parseFloat(element.getAttribute(DATA_X) ?? '')
  const y = parseFloat(element.getAttribute(DATA_Y) ?? '')
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

function resolvedSeriesId(element: ExtendedSVGElement): string | null {
  const datum = element[TOOLTIP_DATUM_SYMBOL]
  if (!datum) return null
  return datum.seriesId || 'unknown'
}

/**
 * Resolve glyph hover from an event target element.
 * GLYPH mode uses event delegation (not data-driven resolvers).
 * Requires data-owlplot-x and data-owlplot-y; no inference from tooltip datum.
 */
export function resolveGlyphFromElement(
  element: Element | null,
  _metadata: RuntimeHoverMetadata
): HoverResolutionResult {
  if (!element) return { kind: 'none' }

  if (!hasDomainAttributes(element)) {
    warnGlyph(
      'element missing data-owlplot-x or data-owlplot-y, cannot resolve'
    )
    return { kind: 'none' }
  }

  const extendedEl = element as ExtendedSVGElement
  const seriesId = resolvedSeriesId(extendedEl)
  if (!seriesId) return { kind: 'none' }

  const point = readDomainPoint(element)
  if (!point) {
    warnGlyph('invalid domain coordinates, cannot resolve hover')
    return { kind: 'none' }
  }

  return {
    kind: 'points',
    points: [{ seriesId, point }],
    primaryIndex: 0,
  }
}
