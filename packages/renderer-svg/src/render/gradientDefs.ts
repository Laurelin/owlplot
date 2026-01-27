import type { GradientPaint, LinearGradientPaint } from '@owlplot/core'
import { normalizeGradientPaint } from '@owlplot/core'
import { createSvgElement } from './svgDom'

/**
 * Simple hash function (djb2 variant) for gradient IDs.
 * Collisions are possible but low-stakes since worst case is shared gradient defs.
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
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
export function hashGradientPaint(paint: GradientPaint): string {
  // Normalize first to get canonical form (endpoints injected, direction defaulted, stops sorted)
  const normalized = normalizeGradientPaint(paint)

  // Create minimal canonical object from normalized paint
  const canonical = {
    type: normalized.type,
    direction:
      normalized.type === 'linear'
        ? normalized.direction
        : undefined,
    stops: normalized.stops.map(({ offset, color }) => [offset, color] as const),
  }

  // Stringify and hash
  const str = JSON.stringify(canonical)
  const hash = hashString(str)

  // Include namespace prefix to avoid collisions
  return `owlplot-grad-${hash}`
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

  // Get or create <defs> element
  let defs = svg.querySelector('defs') as SVGDefsElement | null
  if (!defs) {
    defs = createSvgElement('defs') as SVGDefsElement
    svg.appendChild(defs)
  }

  // Check if gradient already exists
  const existing = defs.querySelector(`#${gradientId}`)
  if (existing) {
    return `url(#${gradientId})`
  }

  // Normalize paint to get canonical form
  const normalized = normalizeGradientPaint(paint)

  // Create gradient element
  const gradient = createSvgElement(
    normalized.type === 'linear' ? 'linearGradient' : 'radialGradient'
  ) as SVGLinearGradientElement | SVGRadialGradientElement

  gradient.setAttribute('id', gradientId)

  // For stroke gradients, use userSpaceOnUse with coordinates that span the plot area
  // objectBoundingBox fails when path bounding box has zero dimension in gradient direction
  // For fill gradients, use objectBoundingBox (applies to shape bounds)
  if (isStroke) {
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse')
    
    // Get SVG dimensions - use viewBox if available, otherwise width/height
    const svgWidth = svg.viewBox.baseVal.width || svg.width.baseVal.value || 600
    const svgHeight = svg.viewBox.baseVal.height || svg.height.baseVal.value || 300

    // Map core semantic directions to SVG coordinates in user space
    // Use full SVG dimensions so gradient spans entire chart area
    if (normalized.type === 'linear') {
      const linearPaint = normalized as LinearGradientPaint
      const direction = linearPaint.direction ?? 'horizontal'

      if (direction === 'vertical') {
        // Top to bottom - span full height
        gradient.setAttribute('x1', '0')
        gradient.setAttribute('y1', '0')
        gradient.setAttribute('x2', '0')
        gradient.setAttribute('y2', String(svgHeight))
      } else {
        // Left to right (default) - span full width
        gradient.setAttribute('x1', '0')
        gradient.setAttribute('y1', '0')
        gradient.setAttribute('x2', String(svgWidth))
        gradient.setAttribute('y2', '0')
      }
    } else {
      // Radial gradient with center at SVG center
      const radialGradient = gradient as SVGRadialGradientElement
      radialGradient.setAttribute('cx', String(svgWidth / 2))
      radialGradient.setAttribute('cy', String(svgHeight / 2))
      radialGradient.setAttribute('r', String(Math.max(svgWidth, svgHeight) / 2))
    }
  } else {
    // Fill gradients use objectBoundingBox
    gradient.setAttribute('gradientUnits', 'objectBoundingBox')

    // Map core semantic directions to SVG coordinates (objectBoundingBox uses 0-1 normalized)
    if (normalized.type === 'linear') {
      const linearPaint = normalized as LinearGradientPaint
      const direction = linearPaint.direction ?? 'horizontal'

      if (direction === 'vertical') {
        // Top to bottom
        gradient.setAttribute('x1', '0%')
        gradient.setAttribute('y1', '0%')
        gradient.setAttribute('x2', '0%')
        gradient.setAttribute('y2', '100%')
      } else {
        // Left to right (default)
        gradient.setAttribute('x1', '0%')
        gradient.setAttribute('y1', '0%')
        gradient.setAttribute('x2', '100%')
        gradient.setAttribute('y2', '0%')
      }
    } else {
      // Radial gradient with center at (0.5, 0.5)
      const radialGradient = gradient as SVGRadialGradientElement
      radialGradient.setAttribute('cx', '50%')
      radialGradient.setAttribute('cy', '50%')
      radialGradient.setAttribute('r', '50%')
    }
  }

  // Add color stops
  for (const stop of normalized.stops) {
    const stopElement = createSvgElement('stop')
    stopElement.setAttribute('offset', `${stop.offset * 100}%`)
    stopElement.setAttribute('stop-color', stop.color)
    gradient.appendChild(stopElement)
  }

  defs.appendChild(gradient)

  return `url(#${gradientId})`
}
