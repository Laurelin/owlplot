import type { PointIndex } from '../types'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'
import {
  SvgAttributeName,
  AnimationAttributeName,
  AnimationEasing,
  DataAttributeName,
} from '../../shared/enums'
import { SVG_NS, createSvgElement } from '../../render/svgDom'

export type EmphasizedPoint = { element: SVGElement; originalRadius: number }

/**
 * Context for point emphasis - enforces invariant: scales are mandatory, DOM is optional.
 * Indicators receive only geometry (scales), not axis semantics.
 */
export type PointEmphasisContext = {
  scales: {
    x: (v: number) => number
    y: (v: number) => number
  }
  pointIndex?: PointIndex
}

/**
 * Result of point emphasis - discriminated union for type-safe branching.
 * Either ALL points use DOM path OR ALL points use synthesized path (never mix).
 */
export type PointEmphasisResult =
  | { mode: 'synthesized'; overlayGroup: SVGGElement }
  | { mode: 'dom'; emphasizedCircles: EmphasizedPoint[] }

/**
 * Get or create hover overlay layer (idempotent).
 *
 * Z-order contract (documented):
 * - Hover overlay sits above series (rendered paths/circles)
 * - Hover overlay sits below tooltip layer (if separate)
 *
 * Do NOT clear children on reuse - single authoritative cleanup path via restorePointEmphasis.
 */
function getOrCreateHoverOverlayLayer(
  svg: SVGSVGElement,
  layerName: string
): SVGGElement {
  const existing = svg.querySelector(
    `g[data-${DataAttributeName.OWLPLOT_HOVER_LAYER}="${layerName}"]`
  )
  if (existing) {
    return existing as SVGGElement
  }

  const overlayGroup = createSvgElement('g') as SVGGElement
  overlayGroup.setAttribute(
    `data-${DataAttributeName.OWLPLOT_HOVER_LAYER}`,
    layerName
  )
  svg.appendChild(overlayGroup)
  return overlayGroup
}

/**
 * INVARIANT: Correctness must never depend on rendered point primitives.
 *
 * Hover is a data concern, not a glyph concern. Indicators visualize data choices,
 * not DOM structure.
 *
 * Rules:
 * - pointIndex is NEVER required for correctness (purely an optimization)
 * - If pointIndex lookup fails or is undefined, synthesize markers from scales + domain coordinates
 * - Indicators receive only geometry (scales), not axis semantics (no hoverMetadata)
 * - Track overlay group, not individual synthesized circles (single group, single cleanup)
 * - Use discriminated union (mode), not boolean flags
 */
export function emphasizePoints(
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>,
  context: PointEmphasisContext,
  svg: SVGSVGElement,
  radius: number,
  animation?: { durationMs?: number; easing?: AnimationEasing }
): PointEmphasisResult {
  // Try pointIndex lookup first (optimization path when DOM circles exist)
  const emphasized: EmphasizedPoint[] = []
  let allFoundViaDom = true

  for (const { seriesId, point } of nearestPoints) {
    const refs = context.pointIndex?.get(seriesId)
    if (!refs || refs.length === 0) {
      allFoundViaDom = false
      break
    }

    const nearestRef = binarySearchNearestByX(refs, point.x)
    if (!nearestRef) {
      allFoundViaDom = false
      break
    }

    const circle = nearestRef.element
    emphasized.push({
      element: circle,
      originalRadius: nearestRef.originalRadius,
    })

    if (animation?.durationMs) {
      circle
        .querySelectorAll(
          `animate[${AnimationAttributeName.ATTRIBUTE_NAME}="${SvgAttributeName.R}"]`
        )
        .forEach((n: Element) => n.remove())

      const animate = document.createElementNS(SVG_NS, 'animate')
      animate.setAttribute(
        AnimationAttributeName.ATTRIBUTE_NAME,
        SvgAttributeName.R
      )
      animate.setAttribute(
        AnimationAttributeName.FROM,
        String(nearestRef.originalRadius)
      )
      animate.setAttribute(AnimationAttributeName.TO, String(radius))
      animate.setAttribute(
        AnimationAttributeName.DUR,
        `${animation.durationMs}ms`
      )
      animate.setAttribute(AnimationAttributeName.FILL, 'freeze')
      circle.appendChild(animate)
      animate.beginElement()
    } else {
      circle.setAttribute(SvgAttributeName.R, String(radius))
    }
  }

  // If ALL points found via pointIndex: return DOM path
  // Handle empty nearestPoints case: return empty DOM result (no emphasis needed)
  if (nearestPoints.length === 0) {
    return { mode: 'dom', emphasizedCircles: [] }
  }

  if (allFoundViaDom && emphasized.length === nearestPoints.length) {
    return { mode: 'dom', emphasizedCircles: emphasized }
  }

  // If ANY point lookup fails or pointIndex is empty/undefined: synthesize
  const overlayGroup = getOrCreateHoverOverlayLayer(svg, 'point-emphasis')

  for (const { point } of nearestPoints) {
    const svgX = context.scales.x(point.x)
    const svgY = context.scales.y(point.y)

    const circle = createSvgElement('circle') as SVGCircleElement
    circle.setAttribute(SvgAttributeName.CX, String(svgX))
    circle.setAttribute(SvgAttributeName.CY, String(svgY))
    circle.setAttribute(SvgAttributeName.R, String(radius))
    circle.setAttribute('fill', 'currentColor')

    if (animation?.durationMs) {
      const animate = document.createElementNS(SVG_NS, 'animate')
      animate.setAttribute(
        AnimationAttributeName.ATTRIBUTE_NAME,
        SvgAttributeName.R
      )
      animate.setAttribute(AnimationAttributeName.FROM, '0')
      animate.setAttribute(AnimationAttributeName.TO, String(radius))
      animate.setAttribute(
        AnimationAttributeName.DUR,
        `${animation.durationMs}ms`
      )
      animate.setAttribute(AnimationAttributeName.FILL, 'freeze')
      circle.appendChild(animate)
      animate.beginElement()
    }

    overlayGroup.appendChild(circle)
  }

  return { mode: 'synthesized', overlayGroup }
}

export function restorePointEmphasis(result: PointEmphasisResult): void {
  if (result.mode === 'synthesized') {
    // Remove entire overlay group - single authoritative cleanup path
    result.overlayGroup.remove()
  } else {
    // Restore original radius on existing circles
    for (const { element, originalRadius } of result.emphasizedCircles) {
      const circle = element as SVGCircleElement
      circle
        .querySelectorAll(
          `animate[${AnimationAttributeName.ATTRIBUTE_NAME}="${SvgAttributeName.R}"]`
        )
        .forEach(n => n.remove())
      circle.setAttribute(SvgAttributeName.R, String(originalRadius))
    }
  }
}
