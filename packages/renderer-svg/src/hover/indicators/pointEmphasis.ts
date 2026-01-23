import type { HoverPointRef } from '../pointIndex'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'
import {
  SvgAttributeName,
  AnimationAttributeName,
  AnimationEasing,
} from '../../shared/enums'
import { SVG_NS } from '../../render/svgDom'

export type EmphasizedPoint = { element: SVGElement; originalRadius: number }

export function emphasizePoints(
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>,
  pointIndex: Map<string, HoverPointRef[]>,
  radius: number,
  animation?: { durationMs?: number; easing?: AnimationEasing }
): EmphasizedPoint[] {
  const emphasized: EmphasizedPoint[] = []

  for (const { seriesId, point } of nearestPoints) {
    const refs = pointIndex.get(seriesId)
    if (!refs) continue

    const nearestRef = binarySearchNearestByX(refs, point.x)
    if (!nearestRef) continue

    const circle = nearestRef.element
    const originalRadius = parseFloat(
      circle.getAttribute(SvgAttributeName.R) || '2.5'
    )
    emphasized.push({ element: circle, originalRadius })

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
      animate.setAttribute(AnimationAttributeName.FROM, String(originalRadius))
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

  return emphasized
}

export function restorePointEmphasis(emphasized: EmphasizedPoint[]) {
  for (const { element, originalRadius } of emphasized) {
    const circle = element as SVGCircleElement
    circle
      .querySelectorAll(
        `animate[${AnimationAttributeName.ATTRIBUTE_NAME}="${SvgAttributeName.R}"]`
      )
      .forEach(n => n.remove())
    circle.setAttribute(SvgAttributeName.R, String(originalRadius))
  }
}
