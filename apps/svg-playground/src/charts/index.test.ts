import { describe, expect, it } from 'vitest'
import { chartGroups } from './index'

describe('chart groups', () => {
  it('registers a legends tab with six demos', () => {
    const legends = chartGroups.find(group => group.id === 'legends')
    expect(legends).toBeDefined()
    expect(legends?.label).toBe('Legends')
    expect(legends?.demos).toHaveLength(6)
  })

  it('registers complexity tab with one screenshot-style Big-O poster demo', () => {
    const complexity = chartGroups.find(group => group.id === 'complexity')
    expect(complexity).toBeDefined()
    expect(complexity?.label).toBe('Complexity Charts')
    expect(complexity?.demos).toHaveLength(1)

    const demo = complexity?.demos[0]
    expect(demo?.id).toBe('big-o-complexity-poster')
    expect(demo?.config.options?.yScale?.type).toBe('linear')
    expect(demo?.config.options?.yDomain).toEqual({
      mode: 'fixed',
      min: 1,
      max: 3000,
    })
    expect(demo?.config.options?.bands).toBeUndefined()
    expect(demo?.config.options?.regions).toHaveLength(2)
    expect(demo?.config.options?.dominanceRegions).toBeDefined()
    expect(demo?.sceneTransforms).toBeUndefined()
    expect(demo?.config.options?.annotations).toHaveLength(6)

    const seriesIds = demo?.config.series.map(series => series.id) ?? []
    expect(seriesIds).toEqual(
      expect.arrayContaining([
        'O(1)',
        'O(log n)',
        'O(n)',
        'O(n log n)',
        'O(n^2)',
        'O(2^n)',
        'O(n!)',
      ])
    )

    const annotationText =
      demo?.config.options?.annotations?.map(annotation => annotation.text) ?? []
    expect(annotationText).toEqual(
      expect.arrayContaining([
        'O(log n), O(1)',
        'O(n)',
        'O(n log n)',
        'O(n^2)',
        'O(2^n)',
        'O(n!)',
      ])
    )

    expect(demo?.meta?.badges).toHaveLength(5)
  })
})
