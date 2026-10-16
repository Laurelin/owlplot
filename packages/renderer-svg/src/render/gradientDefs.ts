import type { GradientPaint } from '@owlplot/core'
import { normalizeGradientPaint } from '@owlplot/core'
import { createSvgElement } from './svgDom'

/**
 * Simple hash function (djb2 variant) for gradient IDs.
 * Collisions are possible but low-stakes since worst case is shared gradient defs.
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16)
}

/**
 * Creates stable hash from gradient properties.
 * Must use normalized paint to ensure semantically-equal gradients hash the same.
 * Includes namespace prefix to avoid collisions with user IDs or other libs.
 */
function hashGradientPaint(paint: GradientPaint): string {
  // Normalize first to get canonical form (endpoints injected, direction defaulted, stops sorted)
  const normalized = normalizeGradientPaint(paint)

  // Create minimal canonical object from normalized paint
  const canonical = {
    type: normalized.type,
    direction: normalized.type === 'linear' ? normalized.direction : undefined,
    stops: normalized.stops.map(
      ({ offset, color }) => [offset, color] as const
    ),
  }

  // Stringify and hash
  const str = JSON.stringify(canonical)
  const hash = hashString(str)

  // Include namespace prefix to avoid collisions
  return `owlplot-grad-${hash}`
}

type NormalizedGradient = ReturnType<typeof normalizeGradientPaint>
type SvgGradientElement = SVGLinearGradientElement | SVGRadialGradientElement
type GradientSpace =
  { kind: 'fill' } | { kind: 'stroke'; width: number; height: number }

function resolveStrokeExtent(
  viewBoxValue: number,
  readDimensionValue: () => number,
  fallback: number
): number {
  if (viewBoxValue) return viewBoxValue
  const dimensionValue = readDimensionValue()
  if (dimensionValue) return dimensionValue
  return fallback
}

function ensureDefs(svg: SVGSVGElement): SVGDefsElement {
  const existing = svg.querySelector('defs') as SVGDefsElement | null
  if (existing) return existing
  const defs = createSvgElement('defs') as SVGDefsElement
  svg.appendChild(defs)
  return defs
}

function resolveGradientSpace(
  svg: SVGSVGElement,
  isStroke: boolean
): GradientSpace {
  if (!isStroke) return { kind: 'fill' }
  return {
    kind: 'stroke',
    width: resolveStrokeExtent(
      svg.viewBox.baseVal.width,
      () => svg.width.baseVal.value,
      600
    ),
    height: resolveStrokeExtent(
      svg.viewBox.baseVal.height,
      () => svg.height.baseVal.value,
      300
    ),
  }
}

function createGradientElement(
  normalized: NormalizedGradient,
  gradientId: string
): SvgGradientElement {
  const tag = normalized.type === 'linear' ? 'linearGradient' : 'radialGradient'
  const gradient = createSvgElement(tag) as SvgGradientElement
  gradient.setAttribute('id', gradientId)
  return gradient
}

function setLinearCoordinates(
  gradient: SVGLinearGradientElement,
  direction: 'horizontal' | 'vertical',
  space: GradientSpace
): void {
  const isVertical = direction === 'vertical'
  if (space.kind === 'fill') {
    gradient.setAttribute('x1', '0%')
    gradient.setAttribute('y1', '0%')
    gradient.setAttribute('x2', selectCoordinate(isVertical, '0%', '100%'))
    gradient.setAttribute('y2', selectCoordinate(isVertical, '100%', '0%'))
    return
  }
  gradient.setAttribute('x1', '0')
  gradient.setAttribute('y1', '0')
  gradient.setAttribute(
    'x2',
    selectCoordinate(isVertical, '0', String(space.width))
  )
  gradient.setAttribute(
    'y2',
    selectCoordinate(isVertical, String(space.height), '0')
  )
}

function selectCoordinate(
  isVertical: boolean,
  vertical: string,
  horizontal: string
): string {
  return isVertical ? vertical : horizontal
}

function setRadialCoordinates(
  gradient: SVGRadialGradientElement,
  space: GradientSpace
): void {
  if (space.kind === 'fill') {
    gradient.setAttribute('cx', '50%')
    gradient.setAttribute('cy', '50%')
    gradient.setAttribute('r', '50%')
    return
  }
  gradient.setAttribute('cx', String(space.width / 2))
  gradient.setAttribute('cy', String(space.height / 2))
  gradient.setAttribute('r', String(Math.max(space.width, space.height) / 2))
}

function configureGradientGeometry(
  gradient: SvgGradientElement,
  normalized: NormalizedGradient,
  space: GradientSpace
): void {
  gradient.setAttribute(
    'gradientUnits',
    space.kind === 'stroke' ? 'userSpaceOnUse' : 'objectBoundingBox'
  )
  if (normalized.type === 'linear') {
    setLinearCoordinates(
      gradient as SVGLinearGradientElement,
      normalized.direction ?? 'horizontal',
      space
    )
    return
  }
  setRadialCoordinates(gradient as SVGRadialGradientElement, space)
}

function appendGradientStops(
  gradient: SvgGradientElement,
  normalized: NormalizedGradient
): void {
  for (const stop of normalized.stops) {
    const stopElement = createSvgElement('stop')
    stopElement.setAttribute('offset', `${stop.offset * 100}%`)
    stopElement.setAttribute('stop-color', stop.color)
    gradient.appendChild(stopElement)
  }
}

/**
 * Ensures a gradient definition exists in SVG <defs>, returns URL reference.
 * Renderer owns IDs - callers never provide them.
 *
 * For stroke gradients, uses userSpaceOnUse so gradients follow the path.
 * For fill gradients, uses objectBoundingBox (default behavior).
 */
export function ensureGradientDef(
  svg: SVGSVGElement,
  paint: GradientPaint,
  options?: { isStroke?: boolean }
): string {
  const isStroke = options?.isStroke ?? false
  const gradientId = hashGradientPaint(paint) + (isStroke ? '-stroke' : '-fill')
  const defs = ensureDefs(svg)
  const existing = defs.querySelector(`#${gradientId}`)
  if (existing) return `url(#${gradientId})`

  const normalized = normalizeGradientPaint(paint)
  const gradient = createGradientElement(normalized, gradientId)
  configureGradientGeometry(
    gradient,
    normalized,
    resolveGradientSpace(svg, isStroke)
  )
  appendGradientStops(gradient, normalized)
  defs.appendChild(gradient)
  return `url(#${gradientId})`
}
