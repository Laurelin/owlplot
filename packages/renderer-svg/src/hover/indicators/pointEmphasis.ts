import type { PointIndex } from '../types'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'
import { DATA_HOVER_LAYER, DATA_SERIES_ID } from '../../shared/dataAttributes'
import { SvgAttributeName } from '../../shared/enums'
import type { HoverSeriesStyle } from '../../tooltip/types'
import { isDualScale } from '../../render/appendNode'
import type { HoverScales } from '../../render/appendNode'

export type EmphasizedPoint = {
  element: SVGElement
  previousTransform: string | null
}

/**
 * Context for point emphasis - scales and pointIndex required.
 * Emphasis composes with existing placement transform (e.g. path translate(cx,cy)).
 */
export type PointEmphasisContext = {
  scales: HoverScales
  pointIndex: PointIndex
  /** Which Y axis each series uses. Present from hover metadata; optional in tests. */
  seriesYAxis?: Record<string, 'left' | 'right'>
}

/** User override for overlay emphasis (precedence: user > series-derived > fallback). */
export type PointEmphasisOverlayOptions = {
  style?: {
    fill?: string
    stroke?: string
    strokeWidth?: number
    opacity?: number
  }
  size?: number
}

/** Context for overlay emphasis (no glyphs): scales, svg, series-derived data, optional user override. */
export type PointEmphasisOverlayContext = {
  scales: HoverScales
  svg: SVGSVGElement
  seriesStyles?: Map<string, HoverSeriesStyle>
  emphasisOptions?: PointEmphasisOverlayOptions
  /** Which Y axis each series uses. Present from hover metadata; optional in tests. */
  seriesYAxis?: Record<string, 'left' | 'right'>
}

/** Result of point emphasis: dom transform or overlay with opaque restore. */
export type PointEmphasisResult =
  | { mode: 'dom'; emphasizedPoints: EmphasizedPoint[] }
  | { mode: 'overlay'; restore: () => void }

/**
 * Apply transform-based scale around glyph center. Composes with existing transform.
 * Store previous transform; restore exactly on cleanup.
 */
export function emphasizePoints(
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>,
  context: PointEmphasisContext,
  _svg: SVGSVGElement,
  scaleFactor: number,
  _animation?: { durationMs?: number; easing?: string } // reserved for future transform animation
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
  let allFound = true

  const seriesYAxis = context.seriesYAxis ?? {}
  const getYScale = (seriesId: string): ((v: number) => number) => {
    const side = seriesYAxis[seriesId] ?? 'left'
    if (isDualScale(context.scales)) {
      return side === 'right' ? context.scales.yRight : context.scales.yLeft
    }
    return context.scales.y
  }

  for (const { seriesId, point } of nearestPoints) {
    const refs = context.pointIndex.get(seriesId)
    if (!refs || refs.length === 0) {
      allFound = false
      break
    }

    const nearestRef = binarySearchNearestByX(refs, point.x)
    if (!nearestRef) {
      allFound = false
      break
    }

    const element = nearestRef.element
    const cx = context.scales.x(nearestRef.x)
    const cy = getYScale(seriesId)(nearestRef.y)
    const prevTransform =
      element.getAttribute(SvgAttributeName.TRANSFORM) ?? null
    // If element already has a placement transform (e.g. path with translate(cx,cy)),
    // only append scale(k) so it scales in place. Otherwise apply full scale-around-center.
    const hasPlacement = prevTransform != null && prevTransform !== ''
    const newTransform = hasPlacement
      ? `${prevTransform} scale(${scaleFactor})`
      : `translate(${cx},${cy}) scale(${scaleFactor}) translate(${-cx},${-cy})`
    element.setAttribute(SvgAttributeName.TRANSFORM, newTransform)
    emphasized.push({ element, previousTransform: prevTransform })
  }

  if (nearestPoints.length === 0) {
    return { mode: 'dom', emphasizedPoints: [] }
  }

  if (allFound && emphasized.length === nearestPoints.length) {
    return { mode: 'dom', emphasizedPoints: emphasized }
  }

  return null
}

/**
 * Draw ephemeral overlay marks when no glyphs exist. Returns opaque restore handle only;
 * raw svg nodes are not exposed outside the indicator. Current implementation uses circles;
 * types do not preclude other shapes later.
 * Precedence: user style > series-derived (seriesStyles) > fallback (currentColor, 0.6).
 */
export function drawPointEmphasisOverlay(
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>,
  context: PointEmphasisOverlayContext,
  radiusOrSize: number
): PointEmphasisResult {
  const size = context.emphasisOptions?.size ?? radiusOrSize
  const g = context.svg.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    'g'
  )
  const seriesYAxis = context.seriesYAxis ?? {}
  const getYScale = (seriesId: string): ((v: number) => number) => {
    const side = seriesYAxis[seriesId] ?? 'left'
    if (isDualScale(context.scales)) {
      return side === 'right' ? context.scales.yRight : context.scales.yLeft
    }
    return context.scales.y
  }

  g.setAttribute(DATA_HOVER_LAYER, 'point-emphasis')
  for (const { seriesId, point } of nearestPoints) {
    const cx = context.scales.x(point.x)
    const cy = getYScale(seriesId)(point.y)
    const fill =
      context.emphasisOptions?.style?.fill ??
      context.seriesStyles?.get(seriesId)?.stroke ??
      'currentColor'
    const opacity = context.emphasisOptions?.style?.opacity ?? 0.6
    const circle = context.svg.ownerDocument.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    )
    circle.setAttribute('cx', String(cx))
    circle.setAttribute('cy', String(cy))
    circle.setAttribute('r', String(size))
    circle.setAttribute('fill', fill)
    circle.setAttribute('opacity', String(opacity))
    circle.setAttribute(DATA_SERIES_ID, seriesId)
    if (context.emphasisOptions?.style?.stroke != null) {
      circle.setAttribute('stroke', context.emphasisOptions.style.stroke)
    }
    if (context.emphasisOptions?.style?.strokeWidth != null) {
      circle.setAttribute(
        'stroke-width',
        String(context.emphasisOptions.style.strokeWidth)
      )
    }
    g.appendChild(circle)
  }
  context.svg.appendChild(g)
  return {
    mode: 'overlay',
    restore: () => g.remove(),
  }
}

export function restorePointEmphasis(result: PointEmphasisResult): void {
  if (result.mode === 'overlay') {
    result.restore()
    return
  }
  for (const { element, previousTransform } of result.emphasizedPoints) {
    if (previousTransform != null) {
      element.setAttribute(SvgAttributeName.TRANSFORM, previousTransform)
    } else {
      element.removeAttribute(SvgAttributeName.TRANSFORM)
    }
  }
}
