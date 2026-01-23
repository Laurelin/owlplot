import { HoverModeKind } from '../shared/enums'

export type HoverMode =
  | { kind: HoverModeKind.NODE }
  | { kind: HoverModeKind.X_AXIS }
  | { kind: HoverModeKind.Y_AXIS }
