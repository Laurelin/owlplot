import { describe, expect, it } from 'vitest'
import type { CartesianSeries } from '../../config/types'
import { createLinearScale } from '../cartesian2d/scale'
import { SceneNodeKind } from '../../scene/types'
import { buildSeriesNodes } from './seriesNodes'

const scales = {
  x: createLinearScale([0, 1], [0, 100]),
  y: createLinearScale([0, 1], [100, 0]),
}

function pointFill(series: CartesianSeries) {
  const nodes = buildSeriesNodes([series], scales, true, undefined, undefined)
  return nodes.find(
    node =>
      node.kind === SceneNodeKind.POINT &&
      node.seriesId === series.id &&
      node.datumIndex === 0
  )?.style?.fill
}

describe('buildSeriesNodes point paint', () => {
  it('preserves an explicit fill before considering stroke', () => {
    expect(
      pointFill({
        id: 'fill',
        points: [{ x: 0, y: 1 }],
        paint: {
          fill: { type: 'solid', color: '#123456' },
          stroke: { type: 'solid', color: '#abcdef' },
        },
      })
    ).toEqual({ type: 'solid', color: '#123456' })
  })

  it('uses a solid stroke when fill is explicitly absent', () => {
    expect(
      pointFill({
        id: 'stroke',
        points: [{ x: 0, y: 1 }],
        paint: {
          fill: undefined,
          stroke: { type: 'solid', color: '#abcdef' },
        },
      })
    ).toEqual({ type: 'solid', color: '#abcdef' })
  })

  it.each([
    [
      'linear',
      {
        type: 'linear',
        stops: [
          { offset: 0, color: '#112233' },
          { offset: 1, color: '#ffffff' },
        ],
      },
    ],
    [
      'radial',
      {
        type: 'radial',
        stops: [
          { offset: 0, color: '#445566' },
          { offset: 1, color: '#ffffff' },
        ],
      },
    ],
  ] as const)(
    'derives point fill from a %s gradient first stop',
    (_, stroke) => {
      expect(
        pointFill({
          id: stroke.type,
          points: [{ x: 0, y: 1 }],
          paint: { fill: undefined, stroke },
        })
      ).toEqual({ type: 'solid', color: stroke.stops[0].color })
    }
  )

  it('falls back to currentColor for an invalid or missing point paint', () => {
    const invalidGradient: CartesianSeries = {
      id: 'invalid-gradient',
      points: [{ x: 0, y: 1 }],
      paint: {
        fill: undefined,
        stroke: {
          type: 'linear',
          stops: [{ offset: 2, color: '#112233' }],
        },
      },
    }
    const missingPaint: CartesianSeries = {
      id: 'missing',
      points: [{ x: 0, y: 1 }],
      paint: { fill: undefined, stroke: undefined },
    }

    expect(pointFill(invalidGradient)).toEqual({
      type: 'solid',
      color: 'currentColor',
    })
    expect(pointFill(missingPaint)).toEqual({
      type: 'solid',
      color: 'currentColor',
    })
  })
})
