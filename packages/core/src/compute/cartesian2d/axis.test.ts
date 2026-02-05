import { describe, expect, it } from 'vitest'
import { formatAxisTickLabel } from './axis'

describe('formatAxisTickLabel', () => {
  it('returns compact when format is AUTO and |value| >= compactThreshold', () => {
    expect(
      formatAxisTickLabel(140000, undefined, {
        tickStep: 1,
        compactThreshold: 10_000,
      })
    ).toMatch(/140K?/i)
    expect(
      formatAxisTickLabel(140000, undefined, {
        tickStep: 1,
        locale: 'en-US',
        compactThreshold: 10_000,
      })
    ).toMatch(/140K?/i)
  })

  it('returns decimals when format is AUTO and |value| < compactThreshold', () => {
    expect(
      formatAxisTickLabel(5000, undefined, {
        tickStep: 1,
        compactThreshold: 10_000,
      })
    ).toBe('5000')
    expect(
      formatAxisTickLabel(140000, undefined, {
        tickStep: 1,
        // no compactThreshold
      })
    ).toBe('140000')
  })

  it('respects explicit axisTickFormat (raw) over compact threshold', () => {
    expect(
      formatAxisTickLabel(
        140000,
        { axisTickFormat: { mode: 'raw' } },
        {
          tickStep: 1,
          compactThreshold: 10_000,
        }
      )
    ).toBe('140000')
  })

  it('respects null axisTickFormat as raw', () => {
    expect(
      formatAxisTickLabel(
        140000,
        { axisTickFormat: null },
        {
          tickStep: 1,
          compactThreshold: 10_000,
        }
      )
    ).toBe('140000')
  })
})
