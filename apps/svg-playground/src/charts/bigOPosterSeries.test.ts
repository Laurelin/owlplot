import { describe, expect, it } from 'vitest'
import {
  BIG_O_CLASS_ORDER,
  createBigOPosterSeries,
  type BigOPosterSeries,
} from './bigOPosterSeries'

function isStrictlyIncreasing(values: readonly number[]): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i]! <= values[i - 1]!) return false
  }
  return true
}

function isMonotoneNonDecreasing(values: readonly number[]): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i]! < values[i - 1]!) return false
  }
  return true
}

describe('createBigOPosterSeries', () => {
  it('creates one series per Big-O class in deterministic order', () => {
    const series = createBigOPosterSeries({ sampleCount: 16, bandGap: 0.01 })
    expect(series.map(item => item.id)).toEqual(BIG_O_CLASS_ORDER)
  })

  it('produces strictly increasing x and monotone nondecreasing y values', () => {
    const series = createBigOPosterSeries({ sampleCount: 18, bandGap: 0.012 })

    for (const item of series) {
      const xs = item.points.map(point => point.x)
      const ys = item.points.map(point => point.y ?? 0)
      expect(isStrictlyIncreasing(xs)).toBe(true)
      expect(isMonotoneNonDecreasing(ys)).toBe(true)
    }
  })

  it('keeps all y values in [0, 1]', () => {
    const series = createBigOPosterSeries({ sampleCount: 20, bandGap: 0.012 })

    for (const item of series) {
      for (const point of item.points) {
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('guarantees strict rank separation at every sampled x index', () => {
    const series = createBigOPosterSeries({ sampleCount: 22, bandGap: 0.012 })
    const length = series[0]?.points.length ?? 0

    for (let i = 0; i < length; i += 1) {
      for (let rank = 0; rank < series.length - 1; rank += 1) {
        const lower = series[rank]!.points[i]!.y ?? 0
        const upper = series[rank + 1]!.points[i]!.y ?? 0
        expect(lower).toBeLessThan(upper)
      }
    }
  })

  it('returns same point count for every class', () => {
    const targetCount = 15
    const series: BigOPosterSeries[] = createBigOPosterSeries({
      sampleCount: targetCount,
      bandGap: 0.012,
    })
    for (const item of series) {
      expect(item.points).toHaveLength(targetCount)
    }
  })
})

