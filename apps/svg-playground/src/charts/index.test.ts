import { describe, expect, it } from 'vitest'
import { chartGroups } from './index'

describe('chart groups', () => {
  it('registers a legends tab with six demos', () => {
    const legends = chartGroups.find(group => group.id === 'legends')
    expect(legends).toBeDefined()
    expect(legends?.label).toBe('Legends')
    expect(legends?.demos).toHaveLength(6)
  })

  it('registers complexity tab with Big-O demo invariants', () => {
    const complexity = chartGroups.find(group => group.id === 'complexity')
    expect(complexity).toBeDefined()
    expect(complexity?.label).toBe('Complexity Charts')
    expect(complexity?.demos).toHaveLength(1)

    const demo = complexity?.demos[0]
    expect(demo?.id).toBe('big-o-complexity-poster')
    expect(demo?.config.options?.yScale?.type).toBe('log')
    expect(demo?.config.options?.regions?.length).toBeGreaterThanOrEqual(5)
    expect(demo?.config.options?.annotations?.length).toBeGreaterThanOrEqual(8)

    const seriesIds = demo?.config.series.map(series => series.id) ?? []
    expect(seriesIds).toEqual(
      expect.arrayContaining(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'])
    )

    const regions = demo?.config.options?.regions ?? []
    for (const region of regions) {
      expect(region.upperSeriesId).not.toBe(region.lowerSeriesId)
    }
  })
})
