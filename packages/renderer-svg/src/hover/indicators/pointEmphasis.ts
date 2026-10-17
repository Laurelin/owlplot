import type { PointIndex } from '../types'
import { binarySearchNearestByX } from '../../shared/binarySearchNearestByX'
import { DATA_HOVER_LAYER, DATA_SERIES_ID } from '../../shared/dataAttributes'
import { SvgAttributeName } from '../../shared/enums'
import { warnDev } from '../../shared/dev'
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

type HoverPoint = { seriesId: string; point: { x: number; y: number } }
type EmphasisPlan = { element: SVGElement; transform: string }

function seriesAxis(
  seriesYAxis: Record<string, 'left' | 'right'> | undefined,
  seriesId: string
): 'left' | 'right' {
  if (!seriesYAxis) return 'left'
  return seriesYAxis[seriesId] ?? 'left'
}

function dualYForward(
  scales: Extract<HoverScales, { yLeft: unknown }>,
  side: 'left' | 'right'
): (value: number) => number {
  if (side === 'right') return scales.yRight.forward
  return scales.yLeft.forward
}

function yForward(
  context: {
    scales: HoverScales
    seriesYAxis?: Record<string, 'left' | 'right'>
  },
  seriesId: string
): (value: number) => number {
  if (!isDualScale(context.scales)) return context.scales.y.forward
  return dualYForward(context.scales, seriesAxis(context.seriesYAxis, seriesId))
}

function emphasisTransform(
  element: SVGElement,
  cx: number,
  cy: number,
  scaleFactor: number
): string {
  const previous = element.getAttribute(SvgAttributeName.TRANSFORM)
  if (previous) return `${previous} scale(${scaleFactor})`
  return `translate(${cx},${cy}) scale(${scaleFactor}) translate(${-cx},${-cy})`
}

function resolveEmphasisPlan(
  hoverPoint: HoverPoint,
  context: PointEmphasisContext,
  scaleFactor: number
): EmphasisPlan | null {
  const refs = context.pointIndex.get(hoverPoint.seriesId)
  if (!refs?.length) return null
  const ref = binarySearchNearestByX(refs, hoverPoint.point.x)
  if (!ref) return null
  const cx = context.scales.x.forward(ref.x)
  const cy = yForward(context, hoverPoint.seriesId)(ref.y)
  return {
    element: ref.element,
    transform: emphasisTransform(ref.element, cx, cy, scaleFactor),
  }
}

function resolveEmphasisPlans(
  points: readonly HoverPoint[],
  context: PointEmphasisContext,
  scaleFactor: number
): EmphasisPlan[] | null {
  const plans: EmphasisPlan[] = []
  for (const point of points) {
    const plan = resolveEmphasisPlan(point, context, scaleFactor)
    if (!plan) return null
    plans.push(plan)
  }
  return plans
}

function applyEmphasisPlans(plans: readonly EmphasisPlan[]): EmphasizedPoint[] {
  return plans.map(plan => {
    const previousTransform =
      plan.element.getAttribute(SvgAttributeName.TRANSFORM) ?? null
    plan.element.setAttribute(SvgAttributeName.TRANSFORM, plan.transform)
    return { element: plan.element, previousTransform }
  })
}

function warnMissingPointIndex(): void {
  warnDev(
    '[owlplot] Point emphasis requested but no glyphs indexed; skipping. ' +
      'Check data-owlplot-* attributes.'
  )
}

/**
 * Apply transform-based scale around glyph center. Composes with existing transform.
 * Store previous transform; restore exactly on cleanup.
 */
export function emphasizePoints(
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>,
  context: PointEmphasisContext,
  scaleFactor: number
): PointEmphasisResult | null {
  if (context.pointIndex.size === 0) {
    warnMissingPointIndex()
    return null
  }
  const plans = resolveEmphasisPlans(nearestPoints, context, scaleFactor)
  if (!plans) return null
  return { mode: 'dom', emphasizedPoints: applyEmphasisPlans(plans) }
}

function overlayFill(
  seriesId: string,
  context: PointEmphasisOverlayContext
): string {
  const configured = context.emphasisOptions?.style?.fill
  if (configured != null) return configured
  return seriesFill(seriesId, context)
}

function seriesFill(
  seriesId: string,
  context: PointEmphasisOverlayContext
): string {
  const stroke = context.seriesStyles?.get(seriesId)?.stroke
  return stroke ?? 'currentColor'
}

function setOverlayStroke(
  circle: SVGCircleElement,
  context: PointEmphasisOverlayContext
): void {
  const style = context.emphasisOptions?.style
  if (style?.stroke != null) circle.setAttribute('stroke', style.stroke)
}

function setOverlayStrokeWidth(
  circle: SVGCircleElement,
  context: PointEmphasisOverlayContext
): void {
  const width = context.emphasisOptions?.style?.strokeWidth
  if (width != null) circle.setAttribute('stroke-width', String(width))
}

function createOverlayCircle(
  hoverPoint: HoverPoint,
  context: PointEmphasisOverlayContext,
  size: number
): SVGCircleElement {
  const circle = context.svg.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  )
  const { seriesId, point } = hoverPoint
  circle.setAttribute('cx', String(context.scales.x.forward(point.x)))
  circle.setAttribute('cy', String(yForward(context, seriesId)(point.y)))
  circle.setAttribute('r', String(size))
  circle.setAttribute('fill', overlayFill(seriesId, context))
  circle.setAttribute(
    'opacity',
    String(context.emphasisOptions?.style?.opacity ?? 0.6)
  )
  circle.setAttribute(DATA_SERIES_ID, seriesId)
  setOverlayStroke(circle, context)
  setOverlayStrokeWidth(circle, context)
  return circle
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
  g.setAttribute(DATA_HOVER_LAYER, 'point-emphasis')
  for (const point of nearestPoints) {
    g.appendChild(createOverlayCircle(point, context, size))
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
