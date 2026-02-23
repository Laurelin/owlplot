import { describe, expect, it } from 'vitest'
import { createLinearScale, createLogScale } from './scale'
import { generateTicks } from './ticks'

describe('generateTicks', () => {
  it('preserves linear tick behavior', () => {
    const scale = createLinearScale([0, 10], [0, 100])
    expect(generateTicks(scale, 5)).toEqual([0, 2.5, 5, 7.5, 10])
  })

  it('generates major decade ticks for log domain [1, 1000]', () => {
    const scale = createLogScale([1, 1000], [0, 1], 10)
    expect(generateTicks(scale, 5)).toEqual([1, 10, 100, 1000])
  })

  it('generates only powers inside domain for [5, 500]', () => {
    const scale = createLogScale([5, 500], [0, 1], 10)
    expect(generateTicks(scale, 5)).toEqual([10, 100])
  })

  it('includes exact boundary powers in closed interval', () => {
    const scale = createLogScale([0.1, 1000], [0, 1], 10)
    expect(generateTicks(scale, 5)).toEqual([0.1, 1, 10, 100, 1000])
  })
})
