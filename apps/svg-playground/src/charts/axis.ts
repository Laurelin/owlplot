import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'

const axisData = {
  kind: ChartKind.LINE,
  series: [
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
  ],
  options: { showPoints: true },
} as const

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
    title: 'Dual Y-Axes',
    description: 'Left and right Y-axes with different labels',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'celsius',
          points: [
            { x: 0, y: 15 },
            { x: 1, y: 18 },
            { x: 2, y: 22 },
            { x: 3, y: 20 },
            { x: 4, y: 25 },
          ],
        },
      ],
      options: {
        showPoints: true,
        yLabel: 'Temperature (°C)',
        yAxisRight: {
          axisLabel: 'Temperature (°F)',
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
] as const
