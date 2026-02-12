import { describe, expect, it } from 'vitest'
import { chartGroups } from './index'

describe('chart groups', () => {
  it('registers a legends tab with six demos', () => {
    const legends = chartGroups.find(group => group.id === 'legends')
    expect(legends).toBeDefined()
    expect(legends?.label).toBe('Legends')
    expect(legends?.demos).toHaveLength(6)
  })
})
