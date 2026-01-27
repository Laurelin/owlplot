// -----------------------------------
// paint type definitions
// -----------------------------------

/**
 * Gradient stop with offset (0-1) and color string.
 * Offsets must be in 0-1 range, sorted ascending (ties allowed for hard color steps).
 */
export type ColorStop = {
  offset: number // 0-1
  color: string // hex or css color
}

/**
 * Linear gradient paint with semantic direction.
 * Direction defaults to "horizontal" if undefined.
 */
export type LinearGradientPaint = {
  type: 'linear'
  direction?: 'vertical' | 'horizontal' // semantic direction, renderer maps to coords
  stops: readonly ColorStop[]
}

/**
 * Radial gradient paint (always center-out, no direction).
 */
export type RadialGradientPaint = {
  type: 'radial'
  stops: readonly ColorStop[]
}

/**
 * Union of linear and radial gradient paints.
 * NO SVG-specific fields (no x1/y1/x2/y2, no gradientUnits - renderer handles this).
 */
export type GradientPaint = LinearGradientPaint | RadialGradientPaint

/**
 * Solid color paint.
 */
export type SolidPaint = {
  type: 'solid'
  color: string
}

/**
 * Union of all paint types.
 */
export type AnyPaint = SolidPaint | GradientPaint

/**
 * Paint styles for fill and stroke, including hover/active states.
 * Partial object to avoid forcing all fields - hover/active are opt-in.
 */
export type PaintStyles = Partial<{
  fill: AnyPaint
  stroke: AnyPaint
  hoverFill: AnyPaint
  hoverStroke: AnyPaint
  activeFill: AnyPaint
  activeStroke: AnyPaint
}>
