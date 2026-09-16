import { describe, expect, it, vi } from 'vitest'
import { sampleFunction } from './dataGenerators'

describe('sampleFunction', () => {
  it('samples the inclusive stepped range', () => {
    expect(sampleFunction(x => x * 2, 1, 3, 1)).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ])
  })

  it('rejects invalid ranges without evaluating the function', () => {
    const fn = vi.fn((x: number) => x)

    expect(sampleFunction(fn, Number.NaN, 2, 1)).toEqual([])
    expect(sampleFunction(fn, 1, Number.POSITIVE_INFINITY, 1)).toEqual([])
    expect(sampleFunction(fn, 2, 1, 1)).toEqual([])
    expect(sampleFunction(fn, 1, 2, 0)).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })

  it('skips non-finite and floor-rejected values by default', () => {
    const values = [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 2]

    expect(sampleFunction(x => values[x]!, 0, 4, 1)).toEqual([{ x: 4, y: 2 }])
  })

  it('can include rejected values and cap valid values', () => {
    const values = [Number.NaN, 0, 4, 10]
    const result = sampleFunction(x => values[x]!, 0, 3, 1, {
      includeInvalid: true,
      yFloor: 1,
      yCap: 5,
    })

    expect(Number.isNaN(result[0]?.y)).toBe(true)
    expect(result.slice(1)).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
    ])
  })
})
