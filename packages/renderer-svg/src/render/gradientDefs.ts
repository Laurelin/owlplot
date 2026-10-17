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
type GradientSpace =
  { kind: 'fill' } | { kind: 'stroke'; width: number; height: number }

/** Pure paint-to-def data shared by the DOM renderer and string output. */
export type GradientDefData = {
  id: string
  tag: 'linearGradient' | 'radialGradient'
  gradientUnits: 'objectBoundingBox' | 'userSpaceOnUse'
  coordinates: Readonly<Record<string, string>>
  stops: readonly { offset: string; color: string }[]
}

export type GradientDefOptions = {
  isStroke?: boolean
  /** Viewport size for stroke gradients (`userSpaceOnUse`); ignored for fills. */
  width?: number
  height?: number
}

function gradientSpace(options: GradientDefOptions): GradientSpace {
  if (!options.isStroke) return { kind: 'fill' }
  return {
    kind: 'stroke',
    width: options.width ?? 600,
    height: options.height ?? 300,
  }
}

function linearCoordinates(
  direction: 'horizontal' | 'vertical',
  space: GradientSpace
): Record<string, string> {
  const isVertical = direction === 'vertical'
  if (space.kind === 'fill') {
    return {
      x1: '0%',
      y1: '0%',
      x2: isVertical ? '0%' : '100%',
      y2: isVertical ? '100%' : '0%',
    }
  }
  return {
    x1: '0',
    y1: '0',
    x2: isVertical ? '0' : String(space.width),
    y2: isVertical ? String(space.height) : '0',
  }
}

function radialCoordinates(space: GradientSpace): Record<string, string> {
  if (space.kind === 'fill') return { cx: '50%', cy: '50%', r: '50%' }
  return {
    cx: String(space.width / 2),
    cy: String(space.height / 2),
    r: String(Math.max(space.width, space.height) / 2),
  }
}

/**
 * Compute the gradient def for a paint without touching the DOM.
 * The DOM renderer turns this data into an element; string output
 * turns it into markup. Both share the id so `url(#id)` matches.
 */
function gradientCoordinates(
  normalized: NormalizedGradient,
  space: GradientSpace
): Record<string, string> {
  if (normalized.type === 'linear') {
    return linearCoordinates(normalized.direction ?? 'horizontal', space)
  }
  return radialCoordinates(space)
}

export function gradientDefData(
  paint: GradientPaint,
  options: GradientDefOptions = {}
): GradientDefData {
  const isStroke = options.isStroke ?? false
  const normalized: NormalizedGradient = normalizeGradientPaint(paint)
  const space = gradientSpace(options)
  return {
    id: hashGradientPaint(paint) + (isStroke ? '-stroke' : '-fill'),
    tag: normalized.type === 'linear' ? 'linearGradient' : 'radialGradient',
    gradientUnits:
      space.kind === 'stroke' ? 'userSpaceOnUse' : 'objectBoundingBox',
    coordinates: gradientCoordinates(normalized, space),
    stops: normalized.stops.map(stop => ({
      offset: `${stop.offset * 100}%`,
      color: stop.color,
    })),
  }
}

function buildGradientElement(data: GradientDefData): SVGElement {
  const gradient = createSvgElement(data.tag)
  gradient.setAttribute('id', data.id)
  gradient.setAttribute('gradientUnits', data.gradientUnits)
  for (const [name, value] of Object.entries(data.coordinates)) {
    gradient.setAttribute(name, value)
  }
  for (const stop of data.stops) {
    const stopElement = createSvgElement('stop')
    stopElement.setAttribute('offset', stop.offset)
    stopElement.setAttribute('stop-color', stop.color)
    gradient.appendChild(stopElement)
  }
  return gradient
}

/** SVG `url(#…)` reference for a gradient paint. */
export function gradientPaintUrl(
  paint: GradientPaint,
  options: GradientDefOptions = {}
): string {
  return `url(#${gradientDefData(paint, options).id})`
}

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

/**
 * Ensures a gradient definition exists in SVG <defs>, returns URL reference.
 * Renderer owns IDs - callers never provide them.
 *
 * For stroke gradients, uses userSpaceOnUse so gradients follow the path.
 * For fill gradients, uses objectBoundingBox (default behavior).
 */
function gradientViewport(svg: SVGSVGElement): {
  width: number
  height: number
} {
  return {
    width: resolveStrokeExtent(
      svg.viewBox?.baseVal.width ?? 0,
      () => svg.width?.baseVal.value ?? 0,
      600
    ),
    height: resolveStrokeExtent(
      svg.viewBox?.baseVal.height ?? 0,
      () => svg.height?.baseVal.value ?? 0,
      300
    ),
  }
}

export function ensureGradientDef(
  svg: SVGSVGElement,
  paint: GradientPaint,
  options?: { isStroke?: boolean }
): string {
  const isStroke = options?.isStroke ?? false
  const data = gradientDefData(paint, {
    isStroke,
    ...gradientViewport(svg),
  })
  const defs = ensureDefs(svg)
  const existing = defs.querySelector(`#${data.id}`)
  if (existing) return `url(#${data.id})`
  defs.appendChild(buildGradientElement(data))
  return `url(#${data.id})`
}
