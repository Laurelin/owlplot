import { HoverIndicatorKind, AnimationEasing } from '../../shared/enums'

export type HoverIndicator =
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
