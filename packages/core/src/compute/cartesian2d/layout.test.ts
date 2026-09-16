import { describe, expect, it } from 'vitest'
import type { CartesianSeries } from '../../config/types'
import type { MeasureText } from '../../text/types'
import { computeCartesianLayout } from './layout'

const measureText: MeasureText = text => ({
  width: text.length * 7,
  height: 12,
})

const padding = { top: 10, right: 10, bottom: 10, left: 10 }

function line(
  id: string,
  points: Array<{ x: number; y: number | null }>,
  yAxis?: 'left' | 'right'
): CartesianSeries {
  return { id, points, yAxis }
}

describe('computeCartesianLayout domains', () => {
  it('normalizes empty and singular data domains', () => {
    const empty = computeCartesianLayout(
      [],
      { width: 100, height: 80 },
      measureText,
      {
        padding,
        enableAdaptivePadding: false,
      }
    )
    const singular = computeCartesianLayout(
      [
        line('one', [
          { x: 4, y: 2 },
          { x: 9, y: null },
        ]),
      ],
      { width: 100, height: 80 },
      measureText,
      { padding, enableAdaptivePadding: false }
    )
    expect(empty.xDomain).toEqual([0, 1])
    expect(empty.yDomain).toEqual([0, 1])
    expect(singular.xDomain).toEqual([4, 5])
    expect(singular.yDomain).toEqual([0, 3])
  })

  it('supports data, include-zero, and fixed policies', () => {
    const series = [
      line('positive', [
        { x: 0, y: 2 },
        { x: 1, y: 4 },
      ]),
    ]
    const data = computeCartesianLayout(
      series,
      { width: 100, height: 80 },
      measureText,
      { padding, enableAdaptivePadding: false, yDomain: { mode: 'data' } }
    )
    const included = computeCartesianLayout(
      series,
      { width: 100, height: 80 },
      measureText,
      { padding, enableAdaptivePadding: false }
    )
    const fixed = computeCartesianLayout(
      series,
      { width: 100, height: 80 },
      measureText,
      {
        padding,
        enableAdaptivePadding: false,
        yDomain: { mode: 'fixed', min: 5, max: 5 },
      }
    )
    expect(data.yDomain).toEqual([2, 4])
    expect(included.yDomain).toEqual([0, 4])
    expect(fixed.yDomain).toEqual([5, 6])
  })

  it.each([
    [{ mode: 'fixed', max: 9 } as const],
    [{ mode: 'fixed', min: 3 } as const],
  ])('treats incomplete fixed policy as data mode', yDomain => {
    const result = computeCartesianLayout(
      [
        line('series', [
          { x: 0, y: 2 },
          { x: 1, y: 4 },
        ]),
      ],
      { width: 100, height: 80 },
      measureText,
      { padding, enableAdaptivePadding: false, yDomain }
    )
    expect(result.yDomain).toEqual([2, 4])
  })

  it('includes finite area baselines and ignores non-finite ones', () => {
    const series: CartesianSeries[] = [
      {
        id: 'zero',
        type: 'area',
        points: [{ x: 0, y: 4 }],
      },
      {
        id: 'custom',
        type: 'area',
        baseline: 10,
        points: [{ x: 1, y: 5 }],
      },
      {
        id: 'invalid',
        type: 'area',
        baseline: Number.NaN,
        points: [{ x: 2, y: 6 }],
      },
      line('line', [{ x: 3, y: -2 }]),
    ]
    const result = computeCartesianLayout(
      series,
      { width: 100, height: 80 },
      measureText,
      { padding, enableAdaptivePadding: false, yDomain: { mode: 'data' } }
    )
    expect(result.yDomain).toEqual([-2, 10])
  })

  it('resolves derived and explicit dual domains', () => {
    const derived = computeCartesianLayout(
      [
        line('left', [
          { x: 0, y: 2 },
          { x: 1, y: 4 },
        ]),
        line(
          'right',
          [
            { x: 0, y: 100 },
            { x: 1, y: 200 },
          ],
          'right'
        ),
      ],
      { width: 200, height: 100 },
      measureText,
      {
        padding,
        enableAdaptivePadding: false,
        yDomain: { mode: 'data' },
      }
    )
    const explicit = computeCartesianLayout(
      [
        line('left', [
          { x: 0, y: 2 },
          { x: 1, y: 4 },
        ]),
      ],
      { width: 200, height: 100 },
      measureText,
      {
        padding,
        enableAdaptivePadding: false,
        yAxisRightDomain: [7, 7],
      }
    )
    expect(derived.yDomainLeft).toEqual([2, 4])
    expect(derived.yDomainRight).toEqual([100, 200])
    expect(derived.scales).toHaveProperty('yLeft')
    expect(explicit.yDomainRight).toEqual([7, 8])
  })
})

describe('computeCartesianLayout geometry and axes', () => {
  it('keeps requested padding when adaptive padding is disabled', () => {
    const result = computeCartesianLayout(
      [
        line('series', [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ]),
      ],
      { width: 25, height: 25 },
      measureText,
      { padding, enableAdaptivePadding: false }
    )
    expect(result.plotRect).toEqual({ x: 10, y: 10, width: 5, height: 5 })
    expect(result.axes.y).toBeUndefined()
    expect(result.scales).toHaveProperty('y')
  })

  it('builds left and right axes with adaptive padding', () => {
    const result = computeCartesianLayout(
      [
        line('left', [
          { x: 0, y: 1 },
          { x: 2, y: 3 },
        ]),
        line(
          'right',
          [
            { x: 0, y: 10 },
            { x: 2, y: 30 },
          ],
          'right'
        ),
      ],
      { width: 400, height: 200 },
      measureText,
      {
        padding,
        xAxis: { tickCount: 3, axisLabel: 'X' },
        yAxis: { tickCount: 4, axisLabel: 'Left' },
        yAxisRight: { tickCount: 2, axisLabel: 'Right' },
        locale: 'en-US',
        compactThreshold: 10,
      }
    )
    expect(result.axes.x.ticks.length).toBeGreaterThan(0)
    expect(result.axes.y?.orientation).toBe('left')
    expect(result.axes.yRight?.orientation).toBe('right')
    expect(result.plotRect.x).toBeGreaterThanOrEqual(10)
  })

  it('uses right-axis tick policy in right-only mode', () => {
    const result = computeCartesianLayout(
      [
        line(
          'right',
          [
            { x: 0, y: 10 },
            { x: 1, y: 20 },
          ],
          'right'
        ),
      ],
      { width: 300, height: 150 },
      measureText,
      {
        padding,
        yAxis: null,
        yAxisRight: { tickCount: 2 },
      }
    )
    expect(result.axes.y).toBeUndefined()
    expect(result.axes.yRight?.ticks.length).toBeGreaterThan(0)
  })
})
