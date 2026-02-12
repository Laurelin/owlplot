import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { withDemoColor } from '../shared/demoPalette'

const sharedSeries = [
  withDemoColor(
    {
      id: 'linear',
      curve: { type: 'linear' as const },
      points: [
        { x: 0, y: 14 },
        { x: 1, y: 22 },
        { x: 2, y: 16 },
        { x: 3, y: 29 },
        { x: 4, y: 21 },
        { x: 5, y: 34 },
      ],
    },
    0
  ),
  withDemoColor(
    {
      id: 'monotoneX',
      curve: { type: 'monotoneX' as const },
      points: [
        { x: 0, y: 30 },
        { x: 1, y: 39 },
        { x: 2, y: 33 },
        { x: 3, y: 47 },
        { x: 4, y: 37 },
        { x: 5, y: 52 },
      ],
    },
    1
  ),
  withDemoColor(
    {
      id: 'catmullRom',
      curve: { type: 'catmullRom' as const },
      points: [
        { x: 0, y: 46 },
        { x: 1, y: 58 },
        { x: 2, y: 49 },
        { x: 3, y: 66 },
        { x: 4, y: 54 },
        { x: 5, y: 72 },
      ],
    },
    2
  ),
] as const

export const legendsCharts: readonly ChartDemo[] = [
  {
    id: 'legend-outside-bottom-default',
    title: 'Outside Legend (Bottom, HTML Default)',
    description:
      'Outside legend uses HTML + flexbox and sits below the chart by default. Click legend items to toggle series visibility.',
    purpose: 'interaction-model',
    config: {
      kind: ChartKind.LINE,
      series: sharedSeries,
      options: { showPoints: false },
    },
    renderOptions: {
      legend: { placement: 'outside', anchor: 'bottom-center' },
    },
  },
  {
    id: 'legend-outside-top',
    title: 'Outside Legend (Top, HTML)',
    description:
      'Outside legend can be rendered above the chart using HTML layout while preserving the same click-to-toggle behavior.',
    purpose: 'interaction-model',
    config: {
      kind: ChartKind.LINE,
      series: sharedSeries,
      options: { showPoints: false },
    },
    renderOptions: {
      legend: { placement: 'outside', anchor: 'top-center' },
    },
  },
  {
    id: 'legend-inside-top-right-svg',
    title: 'Inside Legend (Top-Right, SVG)',
    description:
      'Inside legend is explicitly SVG-only for overlay use cases with deterministic row layout and optional collision-aware anchoring.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: sharedSeries,
      options: { showPoints: false },
    },
    renderOptions: {
      legend: {
        placement: 'inside',
        anchor: 'top-right',
        collision: 'auto-anchor',
        overlapPolicy: 'avoid-frame',
        legendRowHeightPx: 18,
        textOpticalOffsetPx: -0.5,
        background: { paddingPx: 8, borderRadiusPx: 8, opacity: 0.28 },
      },
    },
  },
  {
    id: 'legend-outside-right-column',
    title: 'Outside Legend (Right, Column HTML)',
    description:
      'Outside legend can anchor to the right side as a vertical stack using HTML layout.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: sharedSeries,
      options: { showPoints: false },
    },
    renderOptions: {
      legend: {
        placement: 'outside',
        anchor: 'right-center',
        direction: 'column',
      },
    },
  },
  {
    id: 'legend-outside-left-column',
    title: 'Outside Legend (Left, Column HTML)',
    description:
      'Outside legend can anchor to the left side as a vertical stack while preserving item toggle behavior.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: sharedSeries,
      options: { showPoints: false },
    },
    renderOptions: {
      legend: {
        placement: 'outside',
        anchor: 'left-center',
        direction: 'column',
      },
    },
  },
  {
    id: 'legend-none',
    title: 'Legend Disabled',
    description:
      'Legend rendering can be disabled while keeping core legend metadata in the scene model for custom renderer integrations.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: sharedSeries,
      options: { showPoints: false },
    },
    renderOptions: {
      legend: false,
    },
  },
] as const
