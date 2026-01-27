import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { PRECOMPUTED_DATASETS } from '../shared/dataGenerators'

export const dataCharts: readonly ChartDemo[] = [
  {
    id: 'null-data-points',
    title: 'Null Data Points',
    description: 'Gaps in lines for missing data',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'series1',
          points: [
            { x: 0, y: 10 },
            { x: 1, y: 15 },
            { x: 2, y: null },
            { x: 3, y: 20 },
            { x: 4, y: null },
            { x: 5, y: 25 },
            { x: 6, y: 30 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'sparse-data',
    title: 'Sparse Data',
    description: 'Few data points',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'series1',
          points: [
            { x: 0, y: 10 },
            { x: 5, y: 25 },
            { x: 10, y: 15 },
            { x: 15, y: 30 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'dense-data',
    title: 'Dense Data',
    description: 'Many data points',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'series1',
          points: PRECOMPUTED_DATASETS.dense,
        },
      ],
      options: { showPoints: false },
    },
  },
  {
    id: 'large-ranges',
    title: 'Large Ranges',
    description: 'Big numbers with large value ranges',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'series1',
          points: [
            { x: 0, y: 1000000 },
            { x: 1, y: 1500000 },
            { x: 2, y: 1200000 },
            { x: 3, y: 1800000 },
            { x: 4, y: 2000000 },
            { x: 5, y: 2200000 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'negative-values',
    title: 'Negative Values',
    description: 'Negative Y values',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'series1',
          points: [
            { x: 0, y: -10 },
            { x: 1, y: -5 },
            { x: 2, y: 5 },
            { x: 3, y: 10 },
            { x: 4, y: 15 },
            { x: 5, y: 20 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'zero-crossing',
    title: 'Zero Crossing',
    description: 'Axes crossing at zero',
    purpose: 'edge-case',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'series1',
          points: [
            { x: 0, y: -20 },
            { x: 1, y: -10 },
            { x: 2, y: 0 },
            { x: 3, y: 10 },
            { x: 4, y: 20 },
            { x: 5, y: 15 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
] as const
