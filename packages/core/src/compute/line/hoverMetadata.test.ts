import { describe, expect, it } from 'vitest'
import { createLinearScale, createLogScale } from '../cartesian2d/scale'
import {
  buildHoverMetadata,
  isHoverMetadata,
  type HoverMetadata,
} from './hoverMetadata'

const plotRect = { x: 10, y: 20, width: 100, height: 80 }

function buildSingle(): HoverMetadata {
  return buildHoverMetadata(
    [
      {
        id: 's1',
        type: 'line',
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      },
    ],
    {
      x: createLinearScale([0, 10], [10, 110]),
      y: createLinearScale([0, 20], [100, 20]),
    },
    plotRect,
    [0, 10],
    [0, 20]
  )
}

describe('buildHoverMetadata', () => {
  it('produces JSON.stringify-able metadata', () => {
    const meta = buildSingle()
    expect(() => JSON.stringify(meta)).not.toThrow()
  })

  it('JSON.parse round-trip preserves domain/range/type', () => {
    const meta = buildSingle()
    const roundTrip = JSON.parse(JSON.stringify(meta)) as HoverMetadata
    expect(roundTrip.scales.x.type).toBe('linear')
    expect(roundTrip.scales.x.domain).toEqual([0, 10])
    expect(roundTrip.scales.x.range).toEqual([10, 110])
    if (!('y' in roundTrip.scales)) throw new Error('expected single-scale')
    expect(roundTrip.scales.y.type).toBe('linear')
    expect(roundTrip.scales.y.domain).toEqual([0, 20])
    expect(roundTrip.scales.y.range).toEqual([100, 20])
    expect(roundTrip.xDomain).toEqual([0, 10])
    expect(roundTrip.yDomain).toEqual([0, 20])
  })

  it('round-trips log scale base', () => {
    const meta = buildHoverMetadata(
      [{ id: 's1', type: 'line', points: [{ x: 1, y: 10 }] }],
      {
        x: createLinearScale([1, 100], [0, 100]),
        y: createLogScale([1, 1000], [100, 0], 10),
      },
      plotRect,
      [1, 100],
      [1, 1000]
    )
    const roundTrip = JSON.parse(JSON.stringify(meta)) as HoverMetadata
    if (!('y' in roundTrip.scales)) throw new Error('expected single-scale')
    expect(roundTrip.scales.y).toEqual({
      type: 'log',
      base: 10,
      domain: [1, 1000],
      range: [100, 0],
    })
  })
})

describe('isHoverMetadata', () => {
  it('returns true for built metadata', () => {
    expect(isHoverMetadata(buildSingle())).toBe(true)
  })

  it('returns true after JSON round-trip', () => {
    const roundTrip = JSON.parse(JSON.stringify(buildSingle()))
    expect(isHoverMetadata(roundTrip)).toBe(true)
  })

  it('returns false for methods-only fake scales', () => {
    expect(
      isHoverMetadata({
        scales: {
          x: { forward: () => 0, invert: () => 0 },
          y: { forward: () => 0, invert: () => 0 },
        },
        plotRect,
        xDomain: [0, 1],
        yDomain: [0, 1],
        series: [],
      })
    ).toBe(false)
  })

  it('returns false when required fields are missing', () => {
    expect(isHoverMetadata({ scales: {}, plotRect, series: [] })).toBe(false)
    expect(isHoverMetadata(null)).toBe(false)
    expect(isHoverMetadata(undefined)).toBe(false)
  })
})
