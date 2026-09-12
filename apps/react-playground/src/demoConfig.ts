import { ChartKind, type ChartConfig, type LineSeries } from '@owlplot/core'

const DEMO_PALETTE = ['#2563eb', '#dc2626', '#059669'] as const

function withColor(series: LineSeries, index: number): LineSeries {
  if (series.paint || series.color) return series
  return { ...series, color: DEMO_PALETTE[index % DEMO_PALETTE.length] }
}

/** Simple multi-series demo: legend hide + x-axis hover. */
export const demoSeries: readonly LineSeries[] = [
  withColor(
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
  withColor(
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
  withColor(
    {
      id: 'profit',
      points: [
        { x: 0, y: 20 },
        { x: 1, y: 35 },
        { x: 2, y: 20 },
        { x: 3, y: 45 },
        { x: 4, y: 30 },
        { x: 5, y: 45 },
      ],
    },
    2
  ),
]

export function buildDemoConfig(
  hiddenSeriesIds: readonly string[]
): ChartConfig {
  return {
    kind: ChartKind.LINE,
    series: [...demoSeries],
    options: {
      showPoints: true,
      hiddenSeriesIds,
    },
  }
}

export const CHART_SIZE = { width: 640, height: 358 } as const
