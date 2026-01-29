import { ChartKind } from '@owlplot/core'
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
    id: 'dual-y-axes',
    title: 'Right-side Y Axis (same scale)',
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
    description: 'Mixed visibility: ticks off, labels on (composable per-axis)',
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
          axisLine: true,
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
