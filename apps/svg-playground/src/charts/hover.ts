import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { PRECOMPUTED_DATASETS } from '../shared/dataGenerators'
import { customTooltipRenderer } from '../shared/tooltips'

// Use string literals that match the enum values
// These match HoverModeKind and HoverIndicatorKind from @owlplot/renderer-svg
const HoverModeKind = {
  POINT: 'point' as const,
  X_AXIS: 'x-axis' as const,
}

const HoverIndicatorKind = {
  NONE: 'none' as const,
  X_LINE: 'x-line' as const,
  POINT_EMPHASIS: 'point-emphasis' as const,
}

const hoverData = {
  kind: ChartKind.LINE,
  series: [
    {
      id: 'temperature',
      points: PRECOMPUTED_DATASETS.temperature,
    },
    {
      id: 'humidity',
      points: PRECOMPUTED_DATASETS.humidity,
    },
  ],
  options: { showPoints: true },
} as const

export const hoverCharts: readonly ChartDemo[] = [
  {
    id: 'node-hover',
    title: 'Node Hover',
    description: 'Default point hover - hover individual points',
    purpose: 'interaction-model',
    config: hoverData,
    renderOptions: {
      hoverMode: { kind: HoverModeKind.POINT },
    },
  },
  {
    id: 'x-axis-hover-x-line',
    title: 'X-Axis Hover + X-Line',
    description: 'Hover anywhere, shows vertical line indicator',
    purpose: 'interaction-model',
    config: hoverData,
    renderOptions: {
      hoverMode: { kind: HoverModeKind.X_AXIS },
      hoverIndicator: { kind: HoverIndicatorKind.X_LINE },
    },
  },
  {
    id: 'x-axis-hover-point-emphasis',
    title: 'X-Axis Hover + Point Emphasis',
    description: 'Animated point growth on hover',
    purpose: 'interaction-model',
    config: hoverData,
    renderOptions: {
      hoverMode: { kind: HoverModeKind.X_AXIS },
      hoverIndicator: {
        kind: HoverIndicatorKind.POINT_EMPHASIS,
        radius: 5,
        animation: { durationMs: 120, easing: 'ease-out' },
      },
    },
  },
  {
    id: 'x-axis-hover-no-indicator',
    title: 'X-Axis Hover (No Indicator)',
    description: 'Tooltip only, no visual indicator',
    purpose: 'interaction-model',
    config: hoverData,
    renderOptions: {
      hoverMode: { kind: HoverModeKind.X_AXIS },
      hoverIndicator: { kind: HoverIndicatorKind.NONE },
    },
  },
  {
    id: 'custom-tooltip',
    title: 'Custom Tooltip',
    description: 'Custom HTML tooltip renderer',
    purpose: 'api-example',
    config: hoverData,
    renderOptions: {
      hoverMode: { kind: HoverModeKind.X_AXIS },
      hoverIndicator: { kind: HoverIndicatorKind.X_LINE },
      tooltip: customTooltipRenderer,
    },
  },
] as const
