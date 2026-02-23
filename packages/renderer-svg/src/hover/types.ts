import { HoverModeKind } from '../shared/enums'
import type { HoverPointRef } from '../shared/extendedElements'
import type { HoverSeries, ContinuousScale } from '@owlplot/core'

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

/** Single-scale hover metadata. */
export type HoverMetadataSingle = {
  scales: { x: ContinuousScale; y: ContinuousScale }
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  yDomain: [number, number]
  series: HoverSeries[]
}

/** Dual-scale hover metadata. */
export type HoverMetadataDual = {
  scales: {
    x: ContinuousScale
    yLeft: ContinuousScale
    yRight: ContinuousScale
  }
  yDomainLeft: [number, number]
  yDomainRight: [number, number]
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  series: HoverSeries[]
}

export type HoverMetadata = HoverMetadataSingle | HoverMetadataDual

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

// Type guard for hover metadata (single-scale or dual-scale)
export function isHoverMetadata(value: unknown): value is HoverMetadata {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (
    !('scales' in v) ||
    !('plotRect' in v) ||
    !('xDomain' in v) ||
    !('series' in v)
  )
    return false
  if (typeof v.scales !== 'object' || v.scales === null) return false
  if (!Array.isArray(v.series)) return false
  const scales = v.scales as Record<string, unknown>
  if (
    !('x' in scales) ||
    typeof scales.x !== 'object' ||
    scales.x === null ||
    typeof (scales.x as { forward?: unknown }).forward !== 'function' ||
    typeof (scales.x as { invert?: unknown }).invert !== 'function'
  ) {
    return false
  }
  if ('yLeft' in scales && 'yRight' in scales) {
    return 'yDomainLeft' in v && 'yDomainRight' in v
  }
  return (
    'y' in scales &&
    typeof scales.y === 'object' &&
    scales.y !== null &&
    typeof (scales.y as { forward?: unknown }).forward === 'function' &&
    typeof (scales.y as { invert?: unknown }).invert === 'function' &&
    'yDomain' in v
  )
}
