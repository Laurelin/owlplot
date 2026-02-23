import { describe, expect, it } from 'vitest'
import { Position } from '../../config/types'
import { formatAxisTickLabel, computeAxisLayout } from './axis'
import { createLogScale } from './scale'
import type { MeasureText } from '../../text/types'

const measureText: MeasureText = (text: string) => ({
  width: text.length * 7,
  height: 12,
})

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

describe('computeAxisLayout (log scale ticks)', () => {
  it('uses major decade ticks for domain [1, 1000]', () => {
    const layout = computeAxisLayout(
      Position.LEFT,
      createLogScale([1, 1000], [100, 0], 10),
      measureText,
      { tickCount: 5 },
      {}
    )
    expect(layout.ticks.map(t => t.value)).toEqual([1, 10, 100, 1000])
  })

  it('keeps only powers of base inside the domain', () => {
    const layout = computeAxisLayout(
      Position.LEFT,
      createLogScale([5, 500], [100, 0], 10),
      measureText,
      { tickCount: 5 },
      {}
    )
    expect(layout.ticks.map(t => t.value)).toEqual([10, 100])
  })
})
