import { describe, expect, it } from 'vitest'
import { measureRotatedBoundingBox } from './measureRotatedBoundingBox'

describe('measureRotatedBoundingBox', () => {
  it('returns unchanged bounds for 0 degrees', () => {
    const bounds = measureRotatedBoundingBox(100, 40, 0)
    expect(bounds).toEqual({ width: 100, height: 40 })
  })

  it('swaps bounds for 90 degrees', () => {
    const bounds = measureRotatedBoundingBox(100, 40, Math.PI / 2)
    expect(bounds.width).toBeCloseTo(40, 10)
    expect(bounds.height).toBeCloseTo(100, 10)
  })

  it('computes expected bounds for 45 degrees', () => {
    const bounds = measureRotatedBoundingBox(100, 40, Math.PI / 4)
    const expected = 98.9949493661
    expect(bounds.width).toBeCloseTo(expected, 10)
    expect(bounds.height).toBeCloseTo(expected, 10)
  })
})
