import {
  SceneNodeKind,
  createScaleFromDescriptor,
  type PointShape,
  type ScenePointNode,
} from '@owlplot/core'
import { describe, expect, it, vi } from 'vitest'
import { realizePointNode, type PointRenderContext } from './realizePoint'

const scale = createScaleFromDescriptor({
  type: 'linear',
  domain: [0, 10],
  range: [0, 100],
})

const context: PointRenderContext = {
  scales: { x: scale, yLeft: scale, yRight: scale },
  seriesYAxis: { series: 'right' },
}

function point(shape: PointShape): ScenePointNode {
  return {
    kind: SceneNodeKind.POINT,
    id: `point:series:${shape.kind}`,
    seriesId: 'series',
    x: 2,
    y: 3,
    point: { shape, size: 4 },
  }
}

describe('realizePointNode', () => {
  it.each([
    [{ kind: 'circle' } as const, 'circle'],
    [{ kind: 'square' } as const, 'rect'],
    [{ kind: 'triangle' } as const, 'path'],
    [{ kind: 'diamond' } as const, 'path'],
    [{ kind: 'emoji', value: '🦉' } as const, 'text'],
    [{ kind: 'symbol', name: 'future' } as const, 'circle'],
  ])('realizes $kind geometry', (shape, tag) => {
    expect(realizePointNode(point(shape), context)?.tag).toBe(tag)
  })

  it('skips points without a series id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      realizePointNode(
        { ...point({ kind: 'circle' }), seriesId: undefined },
        context
      )
    ).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      '[owlplot] ScenePointNode requires seriesId; skipping point.'
    )
    warn.mockRestore()
  })
})
