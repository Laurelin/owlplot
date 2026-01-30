import { SvgAttributeName } from '../shared/enums'
import { DATA_SERIES_ID, DATA_X, DATA_Y } from '../shared/dataAttributes'
import type { HoverPointRef } from '../shared/extendedElements'
import type { PointIndex } from './types'

// Re-export for convenience
export type { HoverPointRef }

/**
 * Build point index from any rendered point glyph (circle, rect, path, text).
 * Index is semantic only: element, seriesId, domain x, y.
 * Empty index means no glyphs were rendered, not "glyphs missing."
 */
export function buildPointIndexFromRenderedElements(
  svg: SVGSVGElement
): PointIndex {
  const index = new Map<string, HoverPointRef[]>()
  const elements = svg.querySelectorAll(`[${DATA_SERIES_ID}]`)
  let skipped = 0

  elements.forEach(el => {
    const seriesId = el.getAttribute(DATA_SERIES_ID)
    const domainX = parseFloat(el.getAttribute(DATA_X) ?? '')
    const domainY = parseFloat(el.getAttribute(DATA_Y) ?? '')

    if (
      seriesId == null ||
      seriesId === '' ||
      Number.isNaN(domainX) ||
      Number.isNaN(domainY)
    ) {
      skipped++
      return
    }

    const seriesRefs = index.get(seriesId) ?? []
    seriesRefs.push({
      element: el as SVGElement,
      seriesId,
      x: domainX,
      y: domainY,
    })
    index.set(seriesId, seriesRefs)
  })

  if (
    process.env.NODE_ENV !== 'production' &&
    skipped > 0 &&
    index.size === 0
  ) {
    console.warn(
      `[owlplot] Point index: ${skipped} element(s) had ${DATA_SERIES_ID} but missing or invalid ${DATA_X}/${DATA_Y}; none indexed.`
    )
  }

  for (const refs of index.values()) refs.sort((a, b) => a.x - b.x)
  return index
}

/** Hit slop in SVG units so small glyphs are easier to hover; default 4px. */
const HIT_SLOP_PX = 4

/** Get SVG-space center and hit radius for a point glyph element. */
function getGlyphCenterAndHitRadius(
  el: SVGElement
): { cx: number; cy: number; hitRadius: number } | null {
  const tag = el.tagName.toLowerCase()
  if (tag === 'circle') {
    const cx = parseFloat(el.getAttribute(SvgAttributeName.CX) ?? '')
    const cy = parseFloat(el.getAttribute(SvgAttributeName.CY) ?? '')
    const r = parseFloat(el.getAttribute(SvgAttributeName.R) ?? '')
    if (Number.isNaN(cx) || Number.isNaN(cy) || Number.isNaN(r)) return null
    return { cx, cy, hitRadius: r + HIT_SLOP_PX }
  }
  if (tag === 'rect') {
    const x = parseFloat(el.getAttribute(SvgAttributeName.X) ?? '0')
    const y = parseFloat(el.getAttribute(SvgAttributeName.Y) ?? '0')
    const w = parseFloat(el.getAttribute('width') ?? '0')
    const h = parseFloat(el.getAttribute('height') ?? '0')
    const cx = x + w / 2
    const cy = y + h / 2
    // Point rects are squares: circumradius = half diagonal = width / sqrt(2)
    const circumradius = w / Math.SQRT2
    const hitRadius = circumradius + HIT_SLOP_PX
    return { cx, cy, hitRadius }
  }
  // path, text: use getBBox; hit radius = half diagonal (covers shape, consistent with circumradius idea)
  try {
    const bbox = (el as SVGGraphicsElement).getBBox()
    const cx = bbox.x + bbox.width / 2
    const cy = bbox.y + bbox.height / 2
    const halfDiagonal = Math.sqrt(
      (bbox.width / 2) ** 2 + (bbox.height / 2) ** 2
    )
    const hitRadius = halfDiagonal + HIT_SLOP_PX
    return { cx, cy, hitRadius }
  } catch {
    return null
  }
}

/**
 * Find the glyph that contains the given point in SVG coordinates.
 * Geometry is derived from the element at hit time (circle cx/cy/r, rect center, or getBBox).
 */
export function findGlyphAtPoint(
  pointIndex: PointIndex,
  mouseSvgX: number,
  mouseSvgY: number
): HoverPointRef | null {
  let closest: HoverPointRef | null = null
  let closestDist = Infinity

  for (const refs of pointIndex.values()) {
    for (const ref of refs) {
      const center = getGlyphCenterAndHitRadius(ref.element)
      if (!center) continue
      const { cx, cy, hitRadius } = center
      const dx = mouseSvgX - cx
      const dy = mouseSvgY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= hitRadius && dist < closestDist) {
        closest = ref
        closestDist = dist
      }
    }
  }

  return closest
}
