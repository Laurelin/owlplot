import { describe, expect, it } from 'vitest'
import { HoverModeKind } from '../../shared/enums'
import type { RuntimeHoverMetadata } from '../types'
import { createHoverResolver } from './index'
import { createPointResolver } from './pointResolver'
import { createXAxisResolver } from './xAxisResolver'
import { createYAxisResolver } from './yAxisResolver'

function scale(multiplier = 1) {
  return {
    type: 'linear' as const,
    domain: [0, 100] as const,
    range: [0, 100] as const,
    forward: (value: number) => value * multiplier,
    invert: (value: number) => value / multiplier,
  }
}

function singleMetadata(): RuntimeHoverMetadata {
  return {
    scales: { x: scale(), y: scale() },
    plotRect: { x: 0, y: 0, width: 100, height: 100 },
    xDomain: [0, 10],
    yDomain: [0, 10],
    series: [
      {
        id: 'alpha',
        yAxis: 'left',
        sortedPoints: [
          { x: 0, y: 1 },
          { x: 5, y: 6 },
          { x: 10, y: 9 },
        ],
      },
      { id: 'empty', yAxis: 'left', sortedPoints: [] },
    ],
  }
}

describe('hover resolvers', () => {
  it('creates each explicit resolver and falls back for glyph mode', () => {
    expect(
      createHoverResolver({ kind: HoverModeKind.POINT }).resolve
    ).toBeTypeOf('function')
    expect(
      createHoverResolver({ kind: HoverModeKind.X_AXIS }).resolve
    ).toBeTypeOf('function')
    expect(
      createHoverResolver({ kind: HoverModeKind.Y_AXIS }).resolve
    ).toBeTypeOf('function')
    expect(
      createHoverResolver({ kind: HoverModeKind.GLYPH }).resolve
    ).toBeTypeOf('function')
  })

  it('resolves and clamps an x slice across nonempty series', () => {
    const result = createXAxisResolver().resolve({
      mouseSvgX: 20,
      mouseSvgY: 0,
      metadata: singleMetadata(),
    })
    expect(result).toEqual({
      kind: 'points',
      points: [{ seriesId: 'alpha', point: { x: 10, y: 9 } }],
      primaryIndex: 0,
    })
  })

  it('returns none for x and y slices without points', () => {
    const metadata = { ...singleMetadata(), series: [] }
    expect(
      createXAxisResolver().resolve({
        mouseSvgX: 5,
        mouseSvgY: 5,
        metadata,
      })
    ).toEqual({ kind: 'none' })
    expect(
      createYAxisResolver().resolve({
        mouseSvgX: 5,
        mouseSvgY: 5,
        metadata,
      })
    ).toEqual({ kind: 'none' })
  })

  it('resolves a single-axis y slice and nearest primary point', () => {
    const result = createYAxisResolver().resolve({
      mouseSvgX: 5,
      mouseSvgY: 7,
      metadata: singleMetadata(),
    })
    expect(result.kind).toBe('points')
    if (result.kind === 'points') {
      expect(result.points[0]?.point).toEqual({ x: 5, y: 6 })
      expect(result.primaryIndex).toBe(0)
    }
  })

  it('uses left y for a dual slice and each series axis for primary distance', () => {
    const metadata: RuntimeHoverMetadata = {
      scales: { x: scale(), yLeft: scale(), yRight: scale(10) },
      plotRect: { x: 0, y: 0, width: 100, height: 100 },
      xDomain: [0, 10],
      yDomainLeft: [0, 10],
      yDomainRight: [0, 10],
      series: [
        {
          id: 'left',
          yAxis: 'left',
          sortedPoints: [{ x: 9, y: 5 }],
        },
        {
          id: 'right',
          yAxis: 'right',
          sortedPoints: [{ x: 1, y: 5 }],
        },
      ],
    }
    const result = createYAxisResolver().resolve({
      mouseSvgX: 1,
      mouseSvgY: 5,
      metadata,
    })
    expect(result.kind).toBe('points')
    if (result.kind === 'points') expect(result.primaryIndex).toBe(0)
  })

  it('resolves point proximity in single and dual-axis metadata', () => {
    const single = createPointResolver().resolve({
      mouseSvgX: 5,
      mouseSvgY: 6,
      metadata: singleMetadata(),
    })
    expect(single.kind).toBe('points')

    const dual: RuntimeHoverMetadata = {
      scales: { x: scale(), yLeft: scale(), yRight: scale(10) },
      plotRect: { x: 0, y: 0, width: 100, height: 100 },
      xDomain: [0, 10],
      yDomainLeft: [0, 10],
      yDomainRight: [0, 10],
      series: [
        {
          id: 'right',
          yAxis: 'right',
          sortedPoints: [{ x: 2, y: 3 }],
        },
      ],
    }
    const result = createPointResolver().resolve({
      mouseSvgX: 2,
      mouseSvgY: 30,
      metadata: dual,
    })
    expect(result).toMatchObject({
      kind: 'points',
      points: [{ seriesId: 'right' }],
    })
  })

  it('keeps the nearest candidate across empty, improving, and worse series', () => {
    const metadata: RuntimeHoverMetadata = {
      ...singleMetadata(),
      series: [
        {
          id: 'far',
          yAxis: 'left',
          sortedPoints: [{ x: 5, y: 20 }],
        },
        {
          id: 'near',
          yAxis: 'left',
          sortedPoints: [{ x: 5, y: 6 }],
        },
        { id: 'empty', yAxis: 'left', sortedPoints: [] },
        {
          id: 'worse',
          yAxis: 'left',
          sortedPoints: [{ x: 5, y: 10 }],
        },
      ],
    }
    const result = createPointResolver().resolve({
      mouseSvgX: 5,
      mouseSvgY: 5,
      metadata,
    })
    expect(result).toMatchObject({
      kind: 'points',
      points: [{ seriesId: 'near' }],
    })
  })

  it('returns none for point mode without series', () => {
    const result = createPointResolver().resolve({
      mouseSvgX: 0,
      mouseSvgY: 0,
      metadata: { ...singleMetadata(), series: [] },
    })
    expect(result).toEqual({ kind: 'none' })
  })
})
