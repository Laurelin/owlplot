import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'

export const basicCharts: readonly ChartDemo[] = [
  {
    id: 'simple-line',
    title: 'Simple Line Chart',
    description: 'Single series with basic data points',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
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
      ],
      options: { showPoints: false },
    },
  },
] as const
