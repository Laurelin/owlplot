import { HoverModeKind } from '../shared/enums'
import type { HoverPointRef } from '../shared/extendedElements'
import type { HoverSeries } from '@owlplot/core'

// Domain point types (avoid repetition)
export type DomainPoint = { x: number; y: number }
export type HoverResolvedPoint = { seriesId: string; point: DomainPoint }

// Unified hover resolution result
export type HoverResolutionResult =
  | { kind: 'none' }
  | {
      kind: 'points'
      points: HoverResolvedPoint[]
      primaryIndex: number // Required: which point is "primary" (for tooltip anchor, etc.)
    }

// Unified hover metadata (replaces XAxisHoverMetadata)
export type HoverMetadata = {
  xInvert: (px: number) => number
  yInvert: (py: number) => number
  scales: { x: (v: number) => number; y: (v: number) => number }
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  yDomain: [number, number]
  series: HoverSeries[]
}

// Hover resolver interface
export interface HoverResolver {
  resolve(input: {
    mouseSvgX: number
    mouseSvgY: number
    metadata: HoverMetadata
  }): HoverResolutionResult
}

export type HoverMode =
  | { kind: HoverModeKind.GLYPH }
  | { kind: HoverModeKind.POINT }
  | { kind: HoverModeKind.X_AXIS }
  | { kind: HoverModeKind.Y_AXIS }

// Canonical type for point index - prevents circular dependency creep
export type PointIndex = Map<string, HoverPointRef[]>

// Type guard for hover metadata
export function isHoverMetadata(value: unknown): value is HoverMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    'xInvert' in value &&
    'yInvert' in value &&
    'scales' in value &&
    'plotRect' in value &&
    'xDomain' in value &&
    'yDomain' in value &&
    'series' in value &&
    typeof (value as { xInvert: unknown }).xInvert === 'function' &&
    typeof (value as { yInvert: unknown }).yInvert === 'function' &&
    typeof (value as { scales: unknown }).scales === 'object' &&
    typeof (value as { plotRect: unknown }).plotRect === 'object' &&
    Array.isArray((value as { series: unknown }).series)
  )
}
