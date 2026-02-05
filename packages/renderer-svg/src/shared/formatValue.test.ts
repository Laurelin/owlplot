import { describe, expect, it } from 'vitest'
import { formatValue } from './formatValue'

describe('formatValue', () => {
  it('default (no format) uses raw', () => {
    expect(formatValue(1234.5)).toBe('1234.5')
  })

  it('uses format when provided', () => {
    expect(formatValue(140000, { mode: 'compact' })).toMatch(/140K?/i)
  })

  it('stripCompactInTooltip strips compact (tooltip guard)', () => {
    expect(
      formatValue(140000, { mode: 'compact' }, { stripCompactInTooltip: true })
    ).toBe('140000')
  })

  it('locale applies grouping when set', () => {
    expect(formatValue(1234.5, { mode: 'raw' }, { locale: 'en-US' })).toBe(
      '1,234.5'
    )
  })
})
