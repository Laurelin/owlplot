import { HoverIndicatorKind, AnimationEasing } from '../../shared/enums'
import type { HoverResolutionResult } from '../types'

// Indicator context - geometry only, no axis semantics
export type HoverIndicatorContext = {
  svg: SVGSVGElement
  scales: { x: (v: number) => number; y: (v: number) => number }
  plotRect: { x: number; y: number; width: number; height: number }
}

// Indicator handle - opaque type for cleanup
export type IndicatorHandle = unknown

// Hover indicator interface
export interface HoverIndicator {
  id: string // Required: for O(1) lookup and collision prevention
  render(
    result: HoverResolutionResult,
    context: HoverIndicatorContext
  ): IndicatorHandle
  restore(handle: IndicatorHandle): void
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
      animation?: {
        durationMs?: number
        easing?: AnimationEasing
      }
    }
