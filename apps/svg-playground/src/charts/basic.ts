import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { withDemoColor } from '../shared/demoPalette'

export const basicCharts: readonly ChartDemo[] = [
  {
    id: 'simple-line',
    title: 'Simple Line Chart',
    description: 'Single series with basic data points',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'series1',
            points: [
              { x: 0, y: 10 },
              { x: 1, y: 15 },
              { x: 2, y: 12 },
              { x: 3, y: 18 },
              { x: 4, y: 16 },
              { x: 5, y: 20 },
            ],
          },
          0
        ),
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'multi-series-comparison',
    title: 'Multi-Series Comparison',
    description: 'Multiple series with different colors',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'revenue',
            points: [
              { x: 0, y: 100 },
              { x: 1, y: 120 },
              { x: 2, y: 110 },
              { x: 3, y: 140 },
              { x: 4, y: 130 },
              { x: 5, y: 150 },
            ],
          },
          0
        ),
        withDemoColor(
          {
            id: 'expenses',
            points: [
              { x: 0, y: 80 },
              { x: 1, y: 85 },
              { x: 2, y: 90 },
              { x: 3, y: 95 },
              { x: 4, y: 100 },
              { x: 5, y: 105 },
            ],
          },
          1
        ),
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'with-points',
    title: 'With Points',
    description: 'Line chart with visible data points',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'series1',
            points: [
              { x: 0, y: 50 },
              { x: 1, y: 55 },
              { x: 2, y: 45 },
              { x: 3, y: 60 },
              { x: 4, y: 50 },
              { x: 5, y: 65 },
              { x: 6, y: 55 },
              { x: 7, y: 70 },
            ],
          },
          0
        ),
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'without-points',
    title: 'Without Points',
    description: 'Lines only, no point markers',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'series1',
            points: [
              { x: 0, y: 50 },
              { x: 1, y: 55 },
              { x: 2, y: 45 },
              { x: 3, y: 60 },
              { x: 4, y: 50 },
              { x: 5, y: 65 },
              { x: 6, y: 55 },
              { x: 7, y: 70 },
            ],
          },
          0
        ),
      ],
      options: { showPoints: false },
    },
  },
  {
    id: 'tight-y-domain',
    title: 'Tight Y domain (data extents only)',
    description:
      'Y-axis uses data extents only (yDomain: { mode: "data" }). Opt-out from default include-zero for variation-focused views.',
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
      options: { showPoints: true, yDomain: { mode: 'data' } },
    },
  },
  {
    id: 'curve-modes-comparison',
    title: 'Curve Modes Comparison',
    description:
      'Three series: linear, monotoneX, catmullRom. Use tooltip series labels to compare interpolation modes.',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'linear',
            curve: { type: 'linear' },
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
            curve: { type: 'monotoneX' },
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
            curve: { type: 'catmullRom' },
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
      ],
      options: { showPoints: false },
    },
  },
  {
    id: 'simple-area',
    title: 'Simple Area',
    description: 'Single area series with zero baseline',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'area',
            type: 'area',
            points: [
              { x: 0, y: 10 },
              { x: 1, y: 16 },
              { x: 2, y: 12 },
              { x: 3, y: 19 },
              { x: 4, y: 15 },
            ],
          },
          0
        ),
      ],
      options: { showPoints: false },
    },
  },
  {
    id: 'area-monotone',
    title: 'Area Monotone',
    description: 'Area with monotoneX curve interpolation',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'smooth-area',
            type: 'area',
            curve: { type: 'monotoneX' },
            points: [
              { x: 0, y: 8 },
              { x: 1, y: 15 },
              { x: 2, y: 11 },
              { x: 3, y: 20 },
              { x: 4, y: 14 },
            ],
          },
          1
        ),
      ],
      options: { showPoints: false },
    },
  },
  {
    id: 'area-negative-values',
    title: 'Area With Negatives',
    description: 'Area crossing below and above zero baseline',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'net',
            type: 'area',
            points: [
              { x: 0, y: -12 },
              { x: 1, y: -5 },
              { x: 2, y: 4 },
              { x: 3, y: 9 },
              { x: 4, y: -2 },
            ],
          },
          2
        ),
      ],
      options: { showPoints: false },
    },
  },
  {
    id: 'dual-scale-area',
    title: 'Dual-Scale Area',
    description: 'Left and right area series using independent Y scales',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'temperature-c',
            type: 'area',
            yAxis: 'left',
            points: [
              { x: 0, y: 6 },
              { x: 1, y: 9 },
              { x: 2, y: 14 },
              { x: 3, y: 11 },
              { x: 4, y: 8 },
            ],
          },
          3
        ),
        withDemoColor(
          {
            id: 'humidity',
            type: 'area',
            yAxis: 'right',
            points: [
              { x: 0, y: 55 },
              { x: 1, y: 62 },
              { x: 2, y: 58 },
              { x: 3, y: 66 },
              { x: 4, y: 60 },
            ],
          },
          4
        ),
      ],
      options: {
        showPoints: false,
        yAxisRight: { axisLabel: 'Humidity (%)', tickCount: 5 },
      },
    },
  },
] as const
