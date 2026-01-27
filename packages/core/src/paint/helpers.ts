import { colord } from 'colord'
import type {
  AnyPaint,
  ColorStop,
  GradientPaint,
  LinearGradientPaint,
  RadialGradientPaint,
  SolidPaint,
} from './types'
import type { PaintStyles } from './types'

// Re-export PaintStyles for convenience
export type { PaintStyles } from './types'

/**
 * Default solid paint using currentColor.
 * Canonical constant to avoid stringly-typed drift.
 */
export const DEFAULT_SOLID_CURRENT_COLOR: SolidPaint = {
  type: 'solid',
  color: 'currentColor',
}

/**
 * Transparent/none fill paint for line paths.
 * Lines should not fill - this explicitly sets fill to none.
 */
export const TRANSPARENT_FILL: SolidPaint = {
  type: 'solid',
  color: 'none',
}

/**
 * Normalizes and validates a gradient paint, returning canonicalized paint.
 * - Validates stops.length >= 2
 * - Validates offsets in 0-1 range
 * - Validates offsets sorted ascending (allows ties for hard color steps)
 * - Auto-injects endpoints if first != 0 or last != 1
 * - Defaults linear direction to "horizontal" if undefined
 * - Returns normalized paint with injected endpoints, default direction, sorted stops
 */
export function normalizeGradientPaint(
  paint: GradientPaint
): GradientPaint {
  // Validate stops length
  if (paint.stops.length < 2) {
    throw new Error(
      `GradientPaint must have at least 2 stops, got ${paint.stops.length}`
    )
  }

  // Validate and sort stops
  const stops = [...paint.stops].sort((a, b) => a.offset - b.offset)

  // Validate offsets are in range and sorted
  for (let i = 0; i < stops.length; i++) {
    const offset = stops[i]!.offset
    if (offset < 0 || offset > 1) {
      throw new Error(
        `GradientPaint stop offset must be in range [0, 1], got ${offset}`
      )
    }
    // Allow ties (offset[i] <= offset[i-1] is valid for hard color steps)
    if (i > 0 && offset < stops[i - 1]!.offset) {
      throw new Error(
        `GradientPaint stops must be sorted ascending, got offset ${offset} after ${stops[i - 1]!.offset}`
      )
    }
  }

  // Auto-inject endpoints if missing
  const firstStop = stops[0]!
  const lastStop = stops[stops.length - 1]!
  const normalizedStops: ColorStop[] = [...stops]

  if (firstStop.offset !== 0) {
    normalizedStops.unshift({ offset: 0, color: firstStop.color })
  }
  if (lastStop.offset !== 1) {
    normalizedStops.push({ offset: 1, color: lastStop.color })
  }

  // Handle direction default for linear gradients
  if (paint.type === 'linear') {
    const linearPaint: LinearGradientPaint = {
      type: 'linear',
      direction: paint.direction ?? 'horizontal', // Default to horizontal
      stops: normalizedStops,
    }
    return linearPaint
  } else {
    const radialPaint: RadialGradientPaint = {
      type: 'radial',
      stops: normalizedStops,
    }
    return radialPaint
  }
}

/**
 * Optional validation-only function (throws on invalid, doesn't normalize).
 * Can be used for validation without normalization if needed.
 */
export function validateGradientPaint(paint: GradientPaint): void {
  if (paint.stops.length < 2) {
    throw new Error(
      `GradientPaint must have at least 2 stops, got ${paint.stops.length}`
    )
  }

  const stops = [...paint.stops]
  for (let i = 0; i < stops.length; i++) {
    const offset = stops[i]!.offset
    if (offset < 0 || offset > 1) {
      throw new Error(
        `GradientPaint stop offset must be in range [0, 1], got ${offset}`
      )
    }
    if (i > 0 && offset < stops[i - 1]!.offset) {
      throw new Error(
        `GradientPaint stops must be sorted ascending, got offset ${offset} after ${stops[i - 1]!.offset}`
      )
    }
  }
}

/**
 * Creates a linear gradient from a base color.
 * Uses semantic direction (defaults to "horizontal" if undefined).
 * Returns normalized paint.
 */
export function makeLinearGradientFromBase(
  baseColor: string,
  lighterAmount = 0.4,
  stops = 5,
  direction: 'vertical' | 'horizontal' = 'horizontal'
): LinearGradientPaint {
  const base = colord(baseColor)
  const lighter = base.lighten(lighterAmount)

  // Generate colors by interpolating between base and lighter
  const colors: string[] = []
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1) // 0 to 1
    // Interpolate in HSL space for smoother gradients
    const baseHsl = base.toHsl()
    const lighterHsl = lighter.toHsl()
    
    const h = baseHsl.h + (lighterHsl.h - baseHsl.h) * t
    const s = baseHsl.s + (lighterHsl.s - baseHsl.s) * t
    const l = baseHsl.l + (lighterHsl.l - baseHsl.l) * t
    
    const interpolated = colord({ h, s, l, a: 1 }).toHex()
    colors.push(interpolated)
  }

  const colorStops: ColorStop[] = colors.map((color, i) => ({
    offset: i / (colors.length - 1),
    color,
  }))

  const paint: LinearGradientPaint = {
    type: 'linear',
    direction,
    stops: colorStops,
  }

  return normalizeGradientPaint(paint) as LinearGradientPaint
}

/**
 * Creates a radial gradient from a base color.
 * Returns normalized paint.
 */
export function makeRadialGradientFromBase(
  baseColor: string,
  lighterAmount = 0.4,
  stops = 5
): RadialGradientPaint {
  const base = colord(baseColor)
  const lighter = base.lighten(lighterAmount)

  // Generate colors by interpolating between base and lighter
  const colors: string[] = []
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1) // 0 to 1
    // Interpolate in HSL space for smoother gradients
    const baseHsl = base.toHsl()
    const lighterHsl = lighter.toHsl()
    
    const h = baseHsl.h + (lighterHsl.h - baseHsl.h) * t
    const s = baseHsl.s + (lighterHsl.s - baseHsl.s) * t
    const l = baseHsl.l + (lighterHsl.l - baseHsl.l) * t
    
    const interpolated = colord({ h, s, l, a: 1 }).toHex()
    colors.push(interpolated)
  }

  const colorStops: ColorStop[] = colors.map((color, i) => ({
    offset: i / (colors.length - 1),
    color,
  }))

  const paint: RadialGradientPaint = {
    type: 'radial',
    stops: colorStops,
  }

  return normalizeGradientPaint(paint) as RadialGradientPaint
}

/**
 * Derives partial PaintStyles from a single color.
 * Only provides fill/stroke by default, hover/active are opt-in.
 */
export function derivePaintStylesFromColor(
  baseColor: string,
  options?: {
    enableGradients?: boolean // default: false (opt-in only)
    gradientDirection?: 'vertical' | 'horizontal' // for linear gradients only
    hoverBrightness?: number // default: +0.1 (small delta)
    activeBrightness?: number // default: +0.15 (slightly more than hover)
  }
): Partial<PaintStyles> {
  const enableGradients = options?.enableGradients ?? false
  const gradientDirection = options?.gradientDirection ?? 'horizontal'
  const hoverBrightness = options?.hoverBrightness ?? 0.1
  const activeBrightness = options?.activeBrightness ?? 0.15

  const basePaint: SolidPaint = { type: 'solid', color: baseColor }

  const fill: AnyPaint = enableGradients
    ? makeLinearGradientFromBase(baseColor, 0.6, 6, gradientDirection)
    : basePaint

  const stroke: AnyPaint = basePaint

  const result: Partial<PaintStyles> = {
    fill,
    stroke,
  }

  // Optional hover/active states (opt-in)
  if (options?.hoverBrightness !== undefined || options?.activeBrightness !== undefined) {
    const hoverColor = colord(baseColor).lighten(hoverBrightness).toHex()
    const activeColor = colord(baseColor).lighten(activeBrightness).toHex()

    result.hoverFill = enableGradients
      ? makeLinearGradientFromBase(hoverColor, 0.6, 6, gradientDirection)
      : { type: 'solid', color: hoverColor }

    result.hoverStroke = enableGradients
      ? makeLinearGradientFromBase(hoverColor, 0.2, 4, gradientDirection)
      : { type: 'solid', color: hoverColor }

    result.activeFill = enableGradients
      ? makeLinearGradientFromBase(activeColor, 0.6, 6, gradientDirection)
      : { type: 'solid', color: activeColor }

    result.activeStroke = enableGradients
      ? makeLinearGradientFromBase(activeColor, 0.2, 4, gradientDirection)
      : { type: 'solid', color: activeColor }
  }

  return result
}
