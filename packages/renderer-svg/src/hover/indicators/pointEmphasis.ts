import type { PointIndex } from '../types'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'
import {
  SvgAttributeName,
  AnimationAttributeName,
  AnimationEasing,
} from '../../shared/enums'
import { SVG_NS } from '../../render/svgDom'

export type EmphasizedPoint = { element: SVGElement; originalRadius: number }

/**
 * Context for point emphasis - enforces invariant: scales are mandatory, pointIndex is required.
 * Indicators receive only geometry (scales), not axis semantics.
 */
export type PointEmphasisContext = {
  scales: {
    x: (v: number) => number
    y: (v: number) => number
  }
  pointIndex: PointIndex
}

/**
 * Result of point emphasis - discriminated union for type-safe branching.
 * Either ALL points use DOM path OR ALL points use overlay path (never mix).
 */
export type PointEmphasisResult =
  | { mode: 'overlay'; overlayGroup: SVGGElement }
  | { mode: 'dom'; emphasizedCircles: EmphasizedPoint[] }

// invariant: point emphasis only operates on real rendered glyphs
// if we cannot mutate existing glyph DOM, we do nothing

export function emphasizePoints(
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>,
  context: PointEmphasisContext,
  svg: SVGSVGElement,
  radius: number,
  animation?: { durationMs?: number; easing?: AnimationEasing }
): PointEmphasisResult | null {
  if (!context.pointIndex || context.pointIndex.size === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[owlplot] Point emphasis requested but no glyphs indexed; skipping. ' +
          'Check data-owlplot-* attributes.'
      )
    }
    return null
  }

  const emphasized: EmphasizedPoint[] = []
  let allFoundViaDom = true

  for (const { seriesId, point } of nearestPoints) {
    const refs = context.pointIndex.get(seriesId)
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

  if (nearestPoints.length === 0) {
    return { mode: 'dom', emphasizedCircles: [] }
  }

  if (allFoundViaDom && emphasized.length === nearestPoints.length) {
    return { mode: 'dom', emphasizedCircles: emphasized }
  }

  // Cannot mutate real glyphs (some point lookups failed); do nothing (no overlay)
  return null
}

export function restorePointEmphasis(result: PointEmphasisResult): void {
  if (result.mode === 'overlay') {
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
