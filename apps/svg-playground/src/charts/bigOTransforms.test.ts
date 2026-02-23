import { describe, expect, it } from 'vitest'
import { SceneNodeKind, type SceneNode } from '@owlplot/core'
import { injectBigOWedgeBackgroundTransform } from './bigOTransforms'

function makeScene(): SceneNode {
  return {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    metadata: { hover: { plotRect: { x: 10, y: 20, width: 80, height: 60 } } },
    children: [
      {
        kind: SceneNodeKind.RECT,
        id: 'background',
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        metadata: { role: 'background' },
      },
      { kind: SceneNodeKind.PATH, id: 'series:O(n)', d: 'M 10 80 L 90 20' },
    ],
  }
}

describe('injectBigOWedgeBackgroundTransform', () => {
  it('inserts wedges after background and before series', () => {
    const transformed = injectBigOWedgeBackgroundTransform(makeScene())
    expect(transformed.kind).toBe(SceneNodeKind.GROUP)
    if (transformed.kind !== SceneNodeKind.GROUP) return
    const backgroundIndex = transformed.children.findIndex(n => n.id === 'background')
    const firstWedge = transformed.children.findIndex(n =>
      n.id.startsWith('bigO:wedge:')
    )
    const firstSeries = transformed.children.findIndex(n =>
      n.id.startsWith('series:')
    )
    expect(backgroundIndex).toBe(0)
    expect(firstWedge).toBeGreaterThan(backgroundIndex)
    expect(firstSeries).toBeGreaterThan(firstWedge)
  })

  it('is idempotent when applied twice', () => {
    const once = injectBigOWedgeBackgroundTransform(makeScene())
    const twice = injectBigOWedgeBackgroundTransform(once)
    expect(twice).toBe(once)
  })
})

