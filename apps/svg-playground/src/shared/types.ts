import type { ChartConfig } from '@owlplot/core'
import type {
  TooltipRenderer,
  TooltipContext,
  HoverMode,
  HoverIndicatorConfig,
  LegendOptions,
} from '@owlplot/renderer-svg'
import type { SceneTransform } from './sceneTransforms'

export type RenderOptions = {
  readonly tooltip?: TooltipRenderer | null
  readonly tooltipContext?: TooltipContext
  readonly hoverMode?: HoverMode
  readonly hoverIndicator?: HoverIndicatorConfig | HoverIndicatorConfig[]
  readonly legend?: LegendOptions | boolean | null
}

export type ChartDemoPurpose =
  | 'api-example' // Demonstrates API usage
  | 'edge-case' // Tests edge cases (nulls, negatives, etc.)
  | 'visual-regression' // Visual reference for regression testing
  | 'interaction-model' // Shows interaction patterns

export type ChartDemoMeta = {
  readonly tags?: readonly string[]
  readonly snapshot?: boolean // Include in snapshot tests
  readonly stressTest?: boolean // Performance-heavy demo
  readonly badges?: readonly {
    label: string
    color: string
    textColor?: string
  }[]
}

export type ChartDemo = {
  readonly id: string // semantic: 'simple-line', 'x-axis-hover'
  readonly title: string // human-readable: 'Simple Line Chart'
  readonly description: string // explains why demo exists
  readonly purpose: ChartDemoPurpose // formalized intent
  readonly config: Readonly<ChartConfig> // immutable config
  readonly sceneTransforms?: readonly SceneTransform[]
  readonly renderOptions?: Readonly<RenderOptions>
  readonly meta?: ChartDemoMeta // automation metadata
}

export type ChartGroup = {
  readonly id: string // 'basic', 'hover', 'axis', etc.
  readonly label: string // 'Basic Charts', 'Hover Interactions', etc.
  readonly demos: readonly ChartDemo[] // ordered by conceptual progression
}
