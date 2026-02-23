import { describe, expect, it } from 'vitest'
import { createLinearScale, createLogScale, createScale } from './scale'

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

describe('createLogScale', () => {
  it('maps domain endpoints to range endpoints', () => {
    const scale = createLogScale([1, 1000], [0, 300], 10)
    expect(scale.forward(1)).toBe(0)
    expect(scale.forward(1000)).toBe(300)
  })

  it('roundtrips values with a standard range', () => {
    const scale = createLogScale([1, 1000], [0, 300], 10)
    const value = 100
    const projected = scale.forward(value)
    expect(scale.invert(projected)).toBeCloseTo(value, 10)
  })

  it('roundtrips values with a reversed range', () => {
    const scale = createLogScale([1, 1000], [300, 0], 10)
    const value = 10
    const projected = scale.forward(value)
    expect(scale.invert(projected)).toBeCloseTo(value, 10)
  })

  it('throws when domain includes zero', () => {
    expect(() => createLogScale([0, 100], [0, 1], 10)).toThrow(/must be > 0/i)
  })

  it('throws when domain includes negative values', () => {
    expect(() => createLogScale([-1, 100], [0, 1], 10)).toThrow(
      /must be > 0/i
    )
  })

  it('throws when base is <= 1', () => {
    expect(() => createLogScale([1, 100], [0, 1], 1)).toThrow(/base must be > 1/i)
    expect(() => createLogScale([1, 100], [0, 1], 0.5)).toThrow(
      /base must be > 1/i
    )
  })
})

describe('createScale', () => {
  it('defaults to linear when config is undefined', () => {
    const scale = createScale(undefined, [0, 10], [0, 100])
    expect(scale.type).toBe('linear')
    expect(scale.forward(5)).toBe(50)
  })

  it('creates log scales when requested and defaults log base to 10', () => {
    const scale = createScale({ type: 'log' }, [1, 1000], [0, 3])
    expect(scale.type).toBe('log')
    expect(scale.forward(10)).toBeCloseTo(1, 10)
  })
})
