import { describe, expect, it } from 'vitest'
import { complexityCharts } from './complexity'

describe('complexity chart data invariants', () => {
  it('uses linear axis with fixed domain for clipped dominance rendering', () => {
    const demo = complexityCharts[0]
    expect(demo?.id).toBe('big-o-complexity-poster')
    expect(demo?.config.options?.yScale).toEqual({ type: 'linear' })
    expect(demo?.config.options?.yDomain).toEqual({
      mode: 'fixed',
      min: 1,
      max: 3000,
    })
  })

  it('contains explicit boundary regions and dominance region config', () => {
    const demo = complexityCharts[0]
    const regions = demo?.config.options?.regions ?? []
    expect(regions).toHaveLength(2)
    expect(regions[0]).toMatchObject({
      upper: { type: 'plotTop' },
      lower: { type: 'series', id: 'O(n!)' },
    })
    expect(regions[1]).toMatchObject({
      upper: { type: 'series', id: 'O(log n)' },
      lower: { type: 'plotBottom' },
    })

    const dominance = demo?.config.options?.dominanceRegions
    expect(dominance?.seriesIds).toHaveLength(7)
    expect(dominance?.fills).toHaveLength(6)
    expect(dominance?.tieBreak).toBe('stable-input')
  })

  it('preserves steep growth in fast series (no factorial cap)', () => {
    const demo = complexityCharts[0]
    const factorial = demo?.config.series.find(series => series.id === 'O(n!)')
    const exponential = demo?.config.series.find(series => series.id === 'O(2^n)')
    expect(factorial).toBeDefined()
    expect(exponential).toBeDefined()

    const factorialMax = Math.max(
      ...((factorial?.points ?? [])
        .map(point => point.y)
        .filter((value): value is number => value != null))
    )
    const exponentialAt24 = exponential?.points.find(point => point.x === 24)?.y ?? 0
    expect(factorialMax).toBeGreaterThan(3000)
    expect(exponentialAt24).toBeGreaterThan(3000)
  })
})
