import { ChartKind } from '@owlplot/core'
import { HoverModeKind, HoverIndicatorKind } from '@owlplot/renderer-svg'
import type { ChartDemo } from '../shared/types'
import { PRECOMPUTED_DATASETS } from '../shared/dataGenerators'
import { customTooltipRenderer } from '../shared/tooltips'
import { withDemoColor } from '../shared/demoPalette'

const hoverData = {
  kind: ChartKind.LINE,
  series: [
    withDemoColor(
      {
        id: 'temperature',
        points: [...PRECOMPUTED_DATASETS.temperature],
      },
      0
    ),
    withDemoColor(
      {
        id: 'humidity',
        points: [...PRECOMPUTED_DATASETS.humidity],
      },
      1
    ),
  ],
  options: { showPoints: true },
}

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
      tooltipContext: {
        xFormatter: (x: number | string) => `Month ${x}`,
        xUnit: '°C',
      },
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
      hoverIndicator: [
        { kind: HoverIndicatorKind.X_LINE },
        { kind: HoverIndicatorKind.POINT_EMPHASIS },
      ],
      tooltip: customTooltipRenderer,
    },
  },
  {
    id: 'y-axis-hover-y-line',
    title: 'Y-Axis Hover + Y-Line',
    description:
      'Horizontal slice: hover shows y value and horizontal line (single series)',
    purpose: 'interaction-model',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'value',
            points: [
              { x: 0, y: 20 },
              { x: 1, y: 35 },
              { x: 2, y: 25 },
              { x: 3, y: 50 },
              { x: 4, y: 40 },
              { x: 5, y: 60 },
            ],
          },
          0
        ),
      ],
      options: { showPoints: true },
    },
    renderOptions: {
      hoverMode: { kind: HoverModeKind.Y_AXIS },
      hoverIndicator: { kind: HoverIndicatorKind.Y_LINE },
    },
  },
  {
    id: 'glyph-hover',
    title: 'Glyph Hover',
    description:
      'Hover on point markers (glyphs); event delegation, no x-axis slice',
    purpose: 'interaction-model',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'series1',
            points: [
              { x: 0, y: 10 },
              { x: 1, y: 25 },
              { x: 2, y: 15 },
              { x: 3, y: 30 },
              { x: 4, y: 20 },
              { x: 5, y: 35 },
            ],
          },
          0
        ),
      ],
      options: { showPoints: true },
    },
    renderOptions: {
      hoverMode: { kind: HoverModeKind.GLYPH },
      hoverIndicator: [{ kind: HoverIndicatorKind.POINT_EMPHASIS }],
    },
  },
] as const
