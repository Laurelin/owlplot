import { describe, expect, it } from 'vitest'
import { createLinearScale } from './scale'

describe('createLinearScale', () => {
  it('maps forward and invert exactly for simple integer spans', () => {
    const scale = createLinearScale([0, 10], [0, 100])
    expect(scale.forward(5)).toBe(50)
    expect(scale.invert(50)).toBe(5)
  })

  it('roundtrips values with a reversed range', () => {
    const scale = createLinearScale([0, 10], [100, 0])
    expect(scale.forward(2)).toBe(80)
    expect(scale.invert(80)).toBe(2)
  })

  it('throws when domain span is zero', () => {
    expect(() => createLinearScale([1, 1], [0, 100])).toThrow(
      /domain span must be non-zero/i
    )
  })

  it('throws when range span is zero', () => {
    expect(() => createLinearScale([0, 10], [5, 5])).toThrow(
      /range span must be non-zero/i
    )
  })
})
