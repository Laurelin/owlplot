import { HoverIndicatorKind, AnimationEasing } from '../../shared/enums'
import type { HoverResolutionResult } from '../types'
import type { HoverSeriesStyle } from '../../tooltip/types'
import type { PointShape } from '@owlplot/core'

// Indicator context - geometry only, no axis semantics; series data for emphasis styling
export type HoverIndicatorContext = {
  svg: SVGSVGElement
  scales: { x: (v: number) => number; y: (v: number) => number }
  plotRect: { x: number; y: number; width: number; height: number }
  /** Series stroke/fill for overlay emphasis (from SERIES_STYLES_SYMBOL). */
  seriesStyles?: Map<string, HoverSeriesStyle>
  /** Series point shape for overlay default shape (from SERIES_POINT_SHAPES_SYMBOL). */
  seriesPointShapes?: Map<string, PointShape>
}

// Indicator handle - opaque type for cleanup
export type IndicatorHandle = unknown

// Hover indicator interface
export interface HoverIndicator {
  id: string // Required: for O(1) lookup and collision prevention
  render(
    result: HoverResolutionResult,
    context: HoverIndicatorContext
  ): IndicatorHandle | null
  restore(handle: IndicatorHandle): void
  /**
   * Optional: fingerprint for result equivalence. When present and nextKey === previousKey,
   * lifecycle skips restore + re-render for this indicator (avoids thrashing e.g. point emphasis animation).
   */
  getKey?(
    result: HoverResolutionResult,
    context: HoverIndicatorContext
  ): string | null
}

// Indicator configuration (user-facing)
export type HoverIndicatorConfig =
  | { kind: HoverIndicatorKind.NONE }
  | {
      kind: HoverIndicatorKind.X_LINE
      style?: {
        stroke?: string
        strokeWidth?: number
        strokeDasharray?: string
      }
    }
  | {
      kind: HoverIndicatorKind.Y_LINE
      style?: {
        stroke?: string
        strokeWidth?: number
        strokeDasharray?: string
      }
    }
  | {
      kind: HoverIndicatorKind.POINT_EMPHASIS
      radius?: number
      size?: number
      style?: {
        fill?: string
        stroke?: string
        strokeWidth?: number
        opacity?: number
      }
      animation?: {
        durationMs?: number
        easing?: AnimationEasing
      }
    }
