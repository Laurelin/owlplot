/**
 * Fixture registry: one entry per ChartKind. The mapped `satisfies` type
 * makes a new ChartKind a type error until it has an entry here.
 * Each variant names the bug class it covers.
 */
import { ChartKind, type ChartConfig } from '@owlplot/core'
import { buildDenseLinePoints } from './denseLine'

export type Variant<K extends ChartKind> = {
  id: string
  /** Bug class this variant guards against. */
  covers: string
  config: Extract<ChartConfig, { kind: K }>
}

export type KindFixtures<K extends ChartKind> = {
  /** First entry is the default. */
  variants: readonly Variant<K>[]
}

function pts(ys: readonly (number | null)[]) {
  return ys.map((y, x) => ({ x, y }))
}

export const chartKindFixtures = {
  [ChartKind.LINE]: {
    variants: [
      {
        id: 'basic',
        covers: 'baseline regression; also the README preview chart',
        config: {
          kind: ChartKind.LINE,
          series: [{ id: 'series-1', points: pts([10, 15, 12, 18]) }],
          options: { showPoints: true },
        },
      },
      {
        id: 'empty-series',
        covers: 'empty domain: no data must not yield NaN scales',
        config: { kind: ChartKind.LINE, series: [] },
      },
      {
        id: 'single-point',
        covers: 'zero-width x domain (divide by zero in scale)',
        config: {
          kind: ChartKind.LINE,
          series: [{ id: 'one', points: [{ x: 3, y: 7 }] }],
          options: { showPoints: true },
        },
      },
      {
        id: 'all-equal-y',
        covers: 'zero-height y domain (flat line, degenerate ticks)',
        config: {
          kind: ChartKind.LINE,
          series: [{ id: 'flat', points: pts([5, 5, 5, 5]) }],
        },
      },
      {
        id: 'nulls-gaps',
        covers: 'null y values: path must break, not draw through 0 or NaN',
        config: {
          kind: ChartKind.LINE,
          series: [{ id: 'gaps', points: pts([1, null, 3, null, null, 6]) }],
          options: { showPoints: true },
        },
      },
      {
        id: 'negative-values',
        covers: 'domain crossing zero (sign handling) renders finite',
        config: {
          kind: ChartKind.LINE,
          series: [{ id: 'neg', points: pts([-8, 4, -2, 9, -5]) }],
        },
      },
      {
        id: 'area-baseline',
        covers: 'area fill path is emitted, closed, and extends below the line',
        config: {
          kind: ChartKind.LINE,
          series: [
            {
              id: 'area',
              points: pts([2, 6, 4, 8]),
              type: 'area',
              baseline: 'zero',
            },
          ],
        },
      },
      {
        id: 'many-series-20',
        covers: 'many series: each of 20 series emits its own path',
        config: {
          kind: ChartKind.LINE,
          series: Array.from({ length: 20 }, (_, i) => ({
            id: `s${i}`,
            points: pts([i, i + 2, i + 1, i + 3]),
          })),
        },
      },
      {
        id: 'hidden-series',
        covers: 'hiddenSeriesIds removes geometry and domain contribution',
        config: {
          kind: ChartKind.LINE,
          series: [
            { id: 'shown', points: pts([1, 2, 3]) },
            { id: 'hidden', points: pts([100, 200, 300]) },
          ],
          options: { hiddenSeriesIds: ['hidden'] },
        },
      },
      {
        id: 'dense-50k',
        covers:
          'node explosion: 50k points stay within a fixed scene node budget',
        config: {
          kind: ChartKind.LINE,
          series: [{ id: 'dense', points: buildDenseLinePoints() }],
        },
      },
    ],
  },
} satisfies { [K in ChartKind]: KindFixtures<K> }
