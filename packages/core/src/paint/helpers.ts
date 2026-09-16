import { colord } from 'colord'
import type {
  AnyPaint,
  ColorStop,
  GradientPaint,
  LinearGradientPaint,
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

function validateGradientStops(stops: readonly ColorStop[]): void {
  if (stops.length < 2) {
    throw new Error(
      `GradientPaint must have at least 2 stops, got ${stops.length}`
    )
  }
  for (const stop of stops) validateGradientOffset(stop.offset)
}

function validateGradientOffset(offset: number): void {
  if (offset < 0 || offset > 1) {
    throw new Error(
      `GradientPaint stop offset must be in range [0, 1], got ${offset}`
    )
  }
}

function addGradientEndpoints(stops: readonly ColorStop[]): ColorStop[] {
  const normalized = [...stops]
  const first = normalized[0]!
  const last = normalized[normalized.length - 1]!
  if (first.offset !== 0) {
    normalized.unshift({ offset: 0, color: first.color })
  }
  if (last.offset !== 1) {
    normalized.push({ offset: 1, color: last.color })
  }
  return normalized
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
export function normalizeGradientPaint(paint: GradientPaint): GradientPaint {
  validateGradientStops(paint.stops)
  const stops = [...paint.stops].sort((a, b) => a.offset - b.offset)
  const normalizedStops = addGradientEndpoints(stops)
  if (paint.type === 'linear') {
    return {
      type: 'linear',
      direction: paint.direction ?? 'horizontal',
      stops: normalizedStops,
    }
  }
  return { type: 'radial', stops: normalizedStops }
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
 * Derives partial PaintStyles from a single color.
 * Only provides fill/stroke by default, hover/active are opt-in.
 */
export function derivePaintStylesFromColor(
  baseColor: string,
  options: DerivePaintStylesOptions = {}
): Partial<PaintStyles> {
  const resolved = resolveDeriveOptions(options)
  const basePaint = solidPaint(baseColor)
  const result: Partial<PaintStyles> = {
    fill: createFillPaint(baseColor, resolved),
    stroke: basePaint,
  }

  if (hasInteractiveStates(options)) {
    Object.assign(result, deriveInteractivePaintStyles(baseColor, resolved))
  }

  return result
}

type DerivePaintStylesOptions = {
  enableGradients?: boolean
  gradientDirection?: 'vertical' | 'horizontal'
  hoverBrightness?: number
  activeBrightness?: number
}

type ResolvedDerivePaintStylesOptions = {
  enableGradients: boolean
  gradientDirection: 'vertical' | 'horizontal'
  hoverBrightness: number
  activeBrightness: number
}

function resolveDeriveOptions({
  enableGradients = false,
  gradientDirection = 'horizontal',
  hoverBrightness = 0.1,
  activeBrightness = 0.15,
}: DerivePaintStylesOptions): ResolvedDerivePaintStylesOptions {
  return {
    enableGradients,
    gradientDirection,
    hoverBrightness,
    activeBrightness,
  }
}

function solidPaint(color: string): SolidPaint {
  return { type: 'solid', color }
}

function createGradientPaint(
  color: string,
  lighterAmount: number,
  stops: number,
  direction: 'vertical' | 'horizontal'
): LinearGradientPaint {
  return makeLinearGradientFromBase(color, lighterAmount, stops, direction)
}

function createFillPaint(
  color: string,
  options: ResolvedDerivePaintStylesOptions
): AnyPaint {
  if (!options.enableGradients) return solidPaint(color)
  return createGradientPaint(color, 0.6, 6, options.gradientDirection)
}

function createStrokePaint(
  color: string,
  options: ResolvedDerivePaintStylesOptions
): AnyPaint {
  if (!options.enableGradients) return solidPaint(color)
  return createGradientPaint(color, 0.2, 4, options.gradientDirection)
}

function hasInteractiveStates(options: DerivePaintStylesOptions): boolean {
  return (
    options.hoverBrightness !== undefined ||
    options.activeBrightness !== undefined
  )
}

function deriveInteractivePaintStyles(
  baseColor: string,
  options: ResolvedDerivePaintStylesOptions
): Partial<PaintStyles> {
  const hoverColor = colord(baseColor).lighten(options.hoverBrightness).toHex()
  const activeColor = colord(baseColor)
    .lighten(options.activeBrightness)
    .toHex()
  return {
    hoverFill: createFillPaint(hoverColor, options),
    hoverStroke: createStrokePaint(hoverColor, options),
    activeFill: createFillPaint(activeColor, options),
    activeStroke: createStrokePaint(activeColor, options),
  }
}
