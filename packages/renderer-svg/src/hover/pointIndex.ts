import { SvgAttributeName } from '../shared/enums'
import { DATA_SERIES_ID, DATA_X, DATA_Y } from '../shared/dataAttributes'
import type { HoverPointRef } from '../shared/extendedElements'
import type { PointIndex } from './types'

// Re-export for convenience
export type { HoverPointRef }

/**
 * Build point index from rendered circle elements.
 * Empty index means no glyphs were rendered (e.g. chart with no point marks), not "glyphs missing."
 */
export function buildPointIndexFromRenderedElements(
  svg: SVGSVGElement
): PointIndex {
  const index = new Map<string, HoverPointRef[]>()
  const circles = svg.querySelectorAll(`circle[${DATA_SERIES_ID}]`)
  let skipped = 0

  circles.forEach(circle => {
    const el = circle as SVGCircleElement
    const seriesId = el.getAttribute(DATA_SERIES_ID)
    const domainX = parseFloat(el.getAttribute(DATA_X) || '')
    const domainY = parseFloat(el.getAttribute(DATA_Y) || '')
    const originalRadius = parseFloat(
      el.getAttribute(SvgAttributeName.R) || '2.5'
    )

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
      element: el,
      seriesId,
      x: domainX,
      y: domainY,
      originalRadius, // Store at index build time to prevent restore drift
    })
    index.set(seriesId, seriesRefs)
  })

  if (
    process.env.NODE_ENV !== 'production' &&
    skipped > 0 &&
    index.size === 0
  ) {
    console.warn(
      `[owlplot] Point index: ${skipped} circle(s) had ${DATA_SERIES_ID} but missing or invalid ${DATA_X}/${DATA_Y}; none indexed. ` +
        'Check that circle elements get data-owlplot-x and data-owlplot-y (e.g. from datum.points[0]).'
    )
  }

  for (const refs of index.values()) refs.sort((a, b) => a.x - b.x)
  return index
}

/** Hit slop in SVG units so small glyphs are easier to hover; default 4px. */
const HIT_SLOP_PX = 4

/**
 * Find the glyph (indexed circle) that contains the given point in SVG coordinates.
 * Uses spatial hit testing: distance from point to circle center <= r + HIT_SLOP_PX.
 * If multiple circles contain the point, returns the one whose center is closest.
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
      const cx = parseFloat(
        ref.element.getAttribute(SvgAttributeName.CX) ?? ''
      )
      const cy = parseFloat(
        ref.element.getAttribute(SvgAttributeName.CY) ?? ''
      )
      const r = parseFloat(ref.element.getAttribute(SvgAttributeName.R) ?? '')
      if (Number.isNaN(cx) || Number.isNaN(cy) || Number.isNaN(r)) continue

      const dx = mouseSvgX - cx
      const dy = mouseSvgY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hitRadius = r + HIT_SLOP_PX
      if (dist <= hitRadius && dist < closestDist) {
        closest = ref
        closestDist = dist
      }
    }
  }

  return closest
}
