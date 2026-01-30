import { describe, expect, it } from 'vitest'
import {
  formatRaw,
  formatDecimals,
  formatSignificantFigures,
  formatNumber,
} from './number'

describe('formatRaw', () => {
  it('normalizes -0 to "0"', () => {
    expect(formatRaw(-0)).toBe('0')
    expect(formatRaw(0)).toBe('0')
  })

  it('preserves precision (no spurious rounding)', () => {
    expect(formatRaw(127.857142857)).not.toBe('127.86')
    expect(formatRaw(127.857142857)).toMatch(/127\.8/)
  })

  it('does not emit "1e+3" for normal range (tooltips)', () => {
    expect(formatRaw(1000)).toBe('1000')
    expect(formatRaw(1234.5)).not.toMatch(/e/i)
  })

  it('handles NaN and Infinity', () => {
    expect(formatRaw(Number.NaN)).toBe('NaN')
    expect(formatRaw(Infinity)).toBe('Infinity')
  })
})

describe('formatDecimals', () => {
  it('formats with fixed decimal places', () => {
    expect(formatDecimals(1.234, 2)).toBe('1.23')
    expect(formatDecimals(1.2, 3)).toBe('1.2')
  })

  it('normalizes -0 to "0"', () => {
    expect(formatDecimals(-0, 2)).toBe('0')
  })
})

describe('formatSignificantFigures', () => {
  it('golden: 127.857142857 at 2 sig figs → "130" with no scientific notation', () => {
    expect(formatSignificantFigures(127.857142857, 2)).toBe('130')
  })

  it('formats -0 as "0"', () => {
    expect(formatSignificantFigures(-0, 2)).toBe('0')
  })

  it('throws RangeError when sigFigs < 1', () => {
    expect(() => formatSignificantFigures(1, 0)).toThrow(RangeError)
  })

  it('uses exponential when |value| >= 1e6', () => {
    expect(formatSignificantFigures(1.5e6, 2)).toBe('1.5e+6')
  })
})

describe('formatNumber', () => {
  it('format === undefined (AUTO): step = 5 → 0 decimals', () => {
    expect(formatNumber(120, undefined, { tickStep: 5 })).toBe('120')
    expect(formatNumber(125, undefined, { tickStep: 5 })).toBe('125')
    expect(formatNumber(130, undefined, { tickStep: 5 })).toBe('130')
  })

  it('format === undefined (AUTO): step = 0.25 → 2 decimals', () => {
    expect(formatNumber(1, undefined, { tickStep: 0.25 })).toBe('1')
    expect(formatNumber(1.25, undefined, { tickStep: 0.25 })).toBe('1.25')
    expect(formatNumber(1.5, undefined, { tickStep: 0.25 })).toBe('1.5')
    expect(formatNumber(1.75, undefined, { tickStep: 0.25 })).toBe('1.75')
  })

  it('AUTO: step === 0 falls back to 0 decimals', () => {
    expect(formatNumber(42, undefined, { tickStep: 0 })).toBe('42')
  })

  it('explicit mode raw', () => {
    expect(formatNumber(127.857, { mode: 'raw' })).not.toBe('127.86')
  })

  it('explicit mode decimals', () => {
    expect(formatNumber(1.234, { mode: 'decimals', decimals: 2 })).toBe('1.23')
  })

  it('explicit mode significantFigures', () => {
    expect(
      formatNumber(127.857, {
        mode: 'significantFigures',
        significantFigures: 2,
      })
    ).toBe('130')
  })
})
