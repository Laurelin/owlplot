import { describe, expect, it } from 'vitest'
import { buildAreaPath } from './buildAreaPath'
import type { ScreenPointOrGap } from '../line/curves/types'

describe('buildAreaPath', () => {
  it('builds a closed area path for one contiguous segment', () => {
    const points: ScreenPointOrGap[] = [
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 15 },
    ]
    const path = buildAreaPath({
      points,
      baselineY: 30,
      curve: { type: 'linear' },
    })

    expect(path).toContain('M 0 10')
    expect(path).toContain('L 20 30')
    expect(path.endsWith('Z')).toBe(true)
  })

  it('emits independent closed segments across null gaps', () => {
    const points: ScreenPointOrGap[] = [
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      null,
      { x: 20, y: 15 },
      { x: 30, y: 12 },
    ]
    const path = buildAreaPath({
      points,
      baselineY: 40,
      curve: { type: 'linear' },
    })

    expect((path.match(/\bM\s/g) ?? []).length).toBe(2)
    expect((path.match(/\bZ\b/g) ?? []).length).toBe(2)
    expect(path).not.toContain('L 20 15')
  })

  it('supports monotone curve for area top edge', () => {
    const points: ScreenPointOrGap[] = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 4 },
    ]
    const path = buildAreaPath({
      points,
      baselineY: 5,
      curve: { type: 'monotoneX' },
    })

    expect(path).toContain('C ')
    expect(path.endsWith('Z')).toBe(true)
  })
})
