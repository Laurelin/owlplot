import type { TooltipDatum } from '@owlplot/core'
import { renderSvgScene } from './render/renderSvgScene'
import type { LegendOptions } from './render/legend'

export { renderSvgScene }
export { formatValue } from './shared/formatValue'
export type { TooltipDatum }
export type { LegendOptions }

export type { TooltipRenderer, TooltipContext } from './tooltip/types'
export type { HoverMode } from './hover/types'
export type {
  HoverIndicator,
  HoverIndicatorConfig,
} from './hover/indicators/types'
export {
  HoverModeKind,
  HoverIndicatorKind,
  AnimationEasing,
} from './shared/enums'
