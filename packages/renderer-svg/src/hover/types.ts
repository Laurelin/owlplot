import { HoverModeKind } from '../shared/enums'
import type { HoverPointRef } from '../shared/extendedElements'
import type {
  HoverSeries,
  ContinuousScale,
  HoverMetadata,
  HoverMetadataSingle,
  HoverMetadataDual,
} from '@owlplot/core'
import { isHoverMetadata } from '@owlplot/core'

export type {
  HoverMetadata,
  HoverMetadataSingle,
  HoverMetadataDual,
  HoverSeries,
}
export { isHoverMetadata }

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

/** Runtime single-scale hover metadata (live ContinuousScale). */
export type RuntimeHoverMetadataSingle = {
  scales: { x: ContinuousScale; y: ContinuousScale }
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  yDomain: [number, number]
  series: HoverSeries[]
}

/** Runtime dual-scale hover metadata (live ContinuousScale). */
export type RuntimeHoverMetadataDual = {
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

export type RuntimeHoverMetadata =
  | RuntimeHoverMetadataSingle
  | RuntimeHoverMetadataDual

// Hover resolver interface — uses hydrated runtime scales
export interface HoverResolver {
  resolve(input: {
    mouseSvgX: number
    mouseSvgY: number
    metadata: RuntimeHoverMetadata
  }): HoverResolutionResult
}

export type HoverMode =
  | { kind: HoverModeKind.GLYPH }
  | { kind: HoverModeKind.POINT }
  | { kind: HoverModeKind.X_AXIS }
  | { kind: HoverModeKind.Y_AXIS }

// Canonical type for point index - prevents circular dependency creep
export type PointIndex = Map<string, HoverPointRef[]>
