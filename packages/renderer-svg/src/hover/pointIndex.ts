import { SvgAttributeName } from '../shared/enums'
import { DATA_SERIES_ID, DATA_X, DATA_Y } from '../shared/dataAttributes'
import type { HoverPointRef } from '../shared/extendedElements'
import type { PointIndex } from './types'
import { warnDev } from '../shared/dev'

// Re-export for convenience
export type { HoverPointRef }

function isValidPointRef(
  seriesId: string | null,
  x: number,
  y: number
): seriesId is string {
  if (!seriesId) return false
  return Number.isFinite(x) && Number.isFinite(y)
}

function readPointRef(element: Element): HoverPointRef | null {
  const seriesId = element.getAttribute(DATA_SERIES_ID)
  const x = parseFloat(element.getAttribute(DATA_X) ?? '')
  const y = parseFloat(element.getAttribute(DATA_Y) ?? '')
  if (!isValidPointRef(seriesId, x, y)) return null
  return { element: element as SVGElement, seriesId, x, y }
}

function addPointRef(index: PointIndex, ref: HoverPointRef): void {
  const refs = index.get(ref.seriesId) ?? []
  refs.push(ref)
  index.set(ref.seriesId, refs)
}

function warnIfNothingIndexed(skipped: number, index: PointIndex): void {
  if (skipped === 0 || index.size > 0) return
  warnDev(
    `[owlplot] Point index: ${skipped} element(s) had ${DATA_SERIES_ID} but missing or invalid ${DATA_X}/${DATA_Y}; none indexed.`
  )
}

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
    const ref = readPointRef(el)
    if (!ref) {
      skipped++
      return
    }
    addPointRef(index, ref)
  })

  warnIfNothingIndexed(skipped, index)
  for (const refs of index.values()) refs.sort((a, b) => a.x - b.x)
  return index
}

/** Hit slop in SVG units so small glyphs are easier to hover; default 4px. */
const HIT_SLOP_PX = 4

type GlyphGeometry = { cx: number; cy: number; hitRadius: number }

function numericAttribute(
  element: Element,
  name: string,
  fallback = ''
): number {
  return parseFloat(element.getAttribute(name) ?? fallback)
}

function circleGeometry(element: SVGElement): GlyphGeometry | null {
  const cx = numericAttribute(element, SvgAttributeName.CX)
  const cy = numericAttribute(element, SvgAttributeName.CY)
  const radius = numericAttribute(element, SvgAttributeName.R)
  if (![cx, cy, radius].every(Number.isFinite)) return null
  return { cx, cy, hitRadius: radius + HIT_SLOP_PX }
}

function rectGeometry(element: SVGElement): GlyphGeometry | null {
  const x = numericAttribute(element, SvgAttributeName.X, '0')
  const y = numericAttribute(element, SvgAttributeName.Y, '0')
  const width = numericAttribute(element, 'width', '0')
  const height = numericAttribute(element, 'height', '0')
  if (![x, y, width, height].every(Number.isFinite)) return null
  return {
    cx: x + width / 2,
    cy: y + height / 2,
    hitRadius: Math.hypot(width, height) / 2 + HIT_SLOP_PX,
  }
}

function boundingBoxGeometry(element: SVGElement): GlyphGeometry | null {
  try {
    const box = (element as SVGGraphicsElement).getBBox()
    return {
      cx: box.x + box.width / 2,
      cy: box.y + box.height / 2,
      hitRadius: Math.hypot(box.width, box.height) / 2 + HIT_SLOP_PX,
    }
  } catch {
    return null
  }
}

/** Get SVG-space center and hit radius for a point glyph element. */
function getGlyphCenterAndHitRadius(el: SVGElement): GlyphGeometry | null {
  const tag = el.tagName.toLowerCase()
  if (tag === 'circle') return circleGeometry(el)
  if (tag === 'rect') return rectGeometry(el)
  return boundingBoxGeometry(el)
}

function distanceIfHit(
  ref: HoverPointRef,
  mouseSvgX: number,
  mouseSvgY: number
): number | null {
  const geometry = getGlyphCenterAndHitRadius(ref.element)
  if (!geometry) return null
  const distance = Math.hypot(mouseSvgX - geometry.cx, mouseSvgY - geometry.cy)
  return distance <= geometry.hitRadius ? distance : null
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
      const distance = distanceIfHit(ref, mouseSvgX, mouseSvgY)
      if (distance == null || distance >= closestDist) continue
      closest = ref
      closestDist = distance
    }
  }

  return closest
}
