import { describe, expect, it } from 'vitest'
import { chartGroups } from './index'

describe('chart groups', () => {
  it('registers a legends tab with six demos', () => {
    const legends = chartGroups.find(group => group.id === 'legends')
    expect(legends).toBeDefined()
    expect(legends?.label).toBe('Legends')
    expect(legends?.demos).toHaveLength(6)
  })

  it('registers complexity tab with math and poster Big-O demos', () => {
    const complexity = chartGroups.find(group => group.id === 'complexity')
    expect(complexity).toBeDefined()
    expect(complexity?.label).toBe('Complexity Charts')
    expect(complexity?.demos).toHaveLength(2)

    const mathDemo = complexity?.demos.find(demo => demo.id === 'big-o-complexity-math')
    expect(mathDemo).toBeDefined()
    expect(mathDemo?.config.options?.yScale?.type).toBe('log')
    expect(mathDemo?.config.options?.regions?.length).toBeGreaterThanOrEqual(5)
    expect(mathDemo?.config.options?.annotations?.length).toBeGreaterThanOrEqual(8)

    const seriesIds = mathDemo?.config.series.map(series => series.id) ?? []
    expect(seriesIds).toEqual(
      expect.arrayContaining(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'])
    )

    const regions = mathDemo?.config.options?.regions ?? []
    for (const region of regions) {
      expect(region.upperSeriesId).not.toBe(region.lowerSeriesId)
    }

    const posterDemo = complexity?.demos.find(
      demo => demo.id === 'big-o-complexity-poster'
    )
    expect(posterDemo).toBeDefined()
    expect(posterDemo?.config.options?.yScale?.type).toBe('linear')
    expect(posterDemo?.sceneTransforms?.length).toBeGreaterThanOrEqual(2)
    expect(posterDemo?.config.options?.axisVisibility?.tickLabels).toBe(false)
  })
})
