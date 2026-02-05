import { ChartKind } from '@owlplot/core'
import {
  HoverModeKind,
  HoverIndicatorKind,
  AnimationEasing,
} from '@owlplot/renderer-svg'
import type { ChartDemo } from '../shared/types'
import { withDemoColor } from '../shared/demoPalette'

const axisData = {
  kind: ChartKind.LINE,
  series: [
    withDemoColor(
      {
        id: 'sales',
        points: [
          { x: 0, y: 120 },
          { x: 1, y: 135 },
          { x: 2, y: 150 },
          { x: 3, y: 145 },
          { x: 4, y: 160 },
          { x: 5, y: 175 },
        ],
      },
      0
    ),
  ],
  options: { showPoints: true },
}

export const axisCharts: readonly ChartDemo[] = [
  {
    id: 'custom-labels',
    title: 'Custom Labels',
    description: 'X and Y axis labels',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        xLabel: 'Month',
        yLabel: 'Sales ($)',
      },
    },
  },
  {
    id: 'custom-tick-counts',
    title: 'Custom Tick Counts',
    description: 'Fewer ticks on X-axis, more on Y-axis',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        xTickCount: 3,
        yTickCount: 8,
      },
    },
  },
  {
    id: 'large-numbers-compact-locale',
    title: 'Large Numbers: Compact Axis + Locale',
    description:
      'Y-axis uses compact notation (e.g. 140K) for large values; locale en-US for grouping. Tooltip shows full number with locale.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'revenue',
            points: [
              { x: 0, y: 50_000 },
              { x: 1, y: 75_000 },
              { x: 2, y: 100_000 },
              { x: 3, y: 125_000 },
              { x: 4, y: 150_000 },
            ],
          },
          0
        ),
      ],
      options: {
        showPoints: true,
        xLabel: 'Quarter',
        yLabel: 'Revenue ($)',
        locale: 'en-US',
        compactThreshold: 10_000,
      },
    },
  },
  {
    id: 'angled-labels',
    title: 'Angled Labels',
    description: 'X-axis labels at -45 degree angle',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'traffic',
            points: [
              { x: 0, y: 1000 },
              { x: 1, y: 1200 },
              { x: 2, y: 1100 },
              { x: 3, y: 1400 },
              { x: 4, y: 1300 },
              { x: 5, y: 1500 },
            ],
          },
          0
        ),
      ],
      options: {
        showPoints: true,
        xLabelOrientation: {
          orientation: 'angled',
          angle: -45,
        },
      },
    },
  },
  {
    id: 'right-only-y-axis',
    title: 'Right-only Y Axis',
    description:
      'Primary Y-axis on the right only (one scale, one domain). No left axis.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'series1',
            points: [
              { x: 0, y: 15 },
              { x: 1, y: 18 },
              { x: 2, y: 22 },
              { x: 3, y: 20 },
              { x: 4, y: 25 },
            ],
          },
          0
        ),
      ],
      options: {
        showPoints: true,
        yAxis: { position: 'right' },
        yAxisRight: {
          axisLabel: 'Right Y',
          tickCount: 5,
        },
      },
    },
  },
  {
    id: 'dual-y-axes',
    title: 'Left + Right Y Axes (same scale)',
    description:
      'Optional right Y-axis with its own label (same scale as left). Both axes share one scale.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'series1',
            points: [
              { x: 0, y: 15 },
              { x: 1, y: 18 },
              { x: 2, y: 22 },
              { x: 3, y: 20 },
              { x: 4, y: 25 },
            ],
          },
          0
        ),
      ],
      options: {
        showPoints: true,
        yLabel: 'Left Y',
        yAxisRight: {
          axisLabel: 'Right Y',
          tickCount: 5,
        },
      },
    },
  },
  {
    id: 'dual-scale-y-axes',
    title: 'Dual-scale Y Axes (independent series)',
    description:
      'Two Y axes with different scales and domains. Left: temperature (°C). Right: humidity (%). Each series bound to one axis; lines diverge.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'temperature',
            yAxis: 'left',
            points: [
              { x: 0, y: 22 },
              { x: 1, y: 28 },
              { x: 2, y: 35 },
              { x: 3, y: 42 },
              { x: 4, y: 38 },
              { x: 5, y: 25 },
            ],
          },
          0
        ),
        withDemoColor(
          {
            id: 'humidity',
            yAxis: 'right',
            points: [
              { x: 0, y: 80 },
              { x: 1, y: 65 },
              { x: 2, y: 55 },
              { x: 3, y: 45 },
              { x: 4, y: 60 },
              { x: 5, y: 75 },
            ],
          },
          1
        ),
      ],
      options: {
        showPoints: true,
        yLabel: '°C',
        yAxisRight: {
          axisLabel: '%',
          domain: [0, 100],
          tickCount: 5,
        },
      },
    },
    renderOptions: {
      hoverMode: { kind: HoverModeKind.X_AXIS },
      hoverIndicator: {
        kind: HoverIndicatorKind.POINT_EMPHASIS,
        radius: 5,
        animation: { durationMs: 120, easing: AnimationEasing.EASE_OUT },
      },
    },
  },
  {
    id: 'custom-fonts',
    title: 'Custom Fonts',
    description: 'Different font sizes for axis labels and ticks',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        xLabel: 'Time Period',
        yLabel: 'Revenue',
        axisTickFont: '11px sans-serif',
        axisLabelFont: '16px sans-serif',
      },
    },
  },
  {
    id: 'custom-padding',
    title: 'Custom Padding',
    description: 'Manual padding control',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        padding: {
          top: 40,
          right: 60,
          bottom: 50,
          left: 80,
        },
      },
    },
  },
  {
    id: 'axis-visibility',
    title: 'Axis Visibility',
    description: 'Axis lines and ticks hidden; labels only',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        xLabel: 'Month',
        yLabel: 'Sales',
        axisVisibility: {
          ticks: false,
          tickLabels: true,
          axisLine: false,
        },
      },
    },
  },
  {
    id: 'y-label-orientation',
    title: 'Y-Axis Label Orientation',
    description: 'Y-axis tick labels at -45 degree angle',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        xLabel: 'Month',
        yLabel: 'Revenue',
        yLabelOrientation: {
          orientation: 'angled',
          angle: -45,
        },
      },
    },
  },
  {
    id: 'adaptive-padding',
    title: 'Adaptive Padding',
    description: 'Padding auto-sized from label extents (default)',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        xLabel: 'Time',
        yLabel: 'Value',
        enableAdaptivePadding: true,
      },
    },
  },
  {
    id: 'fixed-padding',
    title: 'Fixed Padding',
    description: 'Explicit padding; adaptive disabled for comparison',
    purpose: 'api-example',
    config: {
      ...axisData,
      options: {
        ...axisData.options,
        xLabel: 'Time',
        yLabel: 'Value',
        enableAdaptivePadding: false,
        padding: { top: 30, right: 30, bottom: 40, left: 50 },
      },
    },
  },
] as const
