import { describe, expect, it } from 'vitest'
import { complexityCharts } from './complexity'

describe('complexity chart data invariants', () => {
  it('keeps all finite y values within fixed log domain bounds', () => {
    const demo = complexityCharts[0]
    expect(demo?.id).toBe('big-o-complexity-poster')

    for (const series of demo?.config.series ?? []) {
      for (const point of series.points) {
        if (point.y == null || !Number.isFinite(point.y)) continue
        expect(point.y).toBeGreaterThanOrEqual(1)
        expect(point.y).toBeLessThanOrEqual(1e7)
      }
    }
  })

  it('caps factorial series at 1e7', () => {
    const demo = complexityCharts[0]
    const factorial = demo?.config.series.find(series => series.id === 'O(n!)')
    expect(factorial).toBeDefined()

    const yValues = factorial?.points
      .map(point => point.y)
      .filter((value): value is number => value != null) ?? []
    expect(yValues.length).toBeGreaterThan(0)
    expect(Math.max(...yValues)).toBe(1e7)
  })

  it('has exponential growth exceeding quadratic by mid-domain', () => {
    const demo = complexityCharts[0]
    const exponential = demo?.config.series.find(series => series.id === 'O(2^n)')
    const quadratic = demo?.config.series.find(series => series.id === 'O(n^2)')
    expect(exponential).toBeDefined()
    expect(quadratic).toBeDefined()

    const byXExp = new Map(
      (exponential?.points ?? [])
        .filter(point => point.y != null)
        .map(point => [point.x, point.y as number])
    )
    const byXQuad = new Map(
      (quadratic?.points ?? [])
        .filter(point => point.y != null)
        .map(point => [point.x, point.y as number])
    )

    const checkX = 10
    const expAt10 = byXExp.get(checkX)
    const quadAt10 = byXQuad.get(checkX)
    expect(expAt10).toBeDefined()
    expect(quadAt10).toBeDefined()
    expect(expAt10).toBeGreaterThan(quadAt10!)
  })
})
