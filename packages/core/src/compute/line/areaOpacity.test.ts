import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AREA_FILL_OPACITY,
  resolveAreaFillOpacity,
  shouldSerializeFillOpacity,
} from './areaOpacity'

describe('area opacity resolver', () => {
  it('prefers series override over chart-level value', () => {
    expect(resolveAreaFillOpacity(0.4, 0.2)).toBe(0.4)
  })

  it('uses chart-level value when series value is undefined', () => {
    expect(resolveAreaFillOpacity(undefined, 0.2)).toBe(0.2)
  })

  it('uses default when both values are missing', () => {
    expect(resolveAreaFillOpacity(undefined, undefined)).toBe(
      DEFAULT_AREA_FILL_OPACITY
    )
  })

  it('skips non-finite values and falls through precedence', () => {
    expect(resolveAreaFillOpacity(Number.NaN, 0.2)).toBe(0.2)
    expect(resolveAreaFillOpacity(Infinity, 0.2)).toBe(0.2)
    expect(resolveAreaFillOpacity(-Infinity, undefined)).toBe(
      DEFAULT_AREA_FILL_OPACITY
    )
  })

  it('clamps final value to [0,1]', () => {
    expect(resolveAreaFillOpacity(-2, undefined)).toBe(0)
    expect(resolveAreaFillOpacity(2, undefined)).toBe(1)
  })
})

describe('area opacity serialization', () => {
  it('serializes only when opacity is below 1', () => {
    expect(shouldSerializeFillOpacity(0.99)).toBe(true)
    expect(shouldSerializeFillOpacity(1)).toBe(false)
    expect(shouldSerializeFillOpacity(2)).toBe(false)
  })
})
