import { describe, expect, it } from 'vitest'
import { SceneNodeKind, type SceneNode } from '@owlplot/core'
import { applySceneTransforms, type SceneTransform } from './sceneTransforms'

function makeRoot(id: string): SceneNode {
  return {
    kind: SceneNodeKind.GROUP,
    id,
    children: [],
  }
}

describe('applySceneTransforms', () => {
  it('returns the same scene reference when no transforms are provided', () => {
    const scene = makeRoot('root')

    const result = applySceneTransforms(scene)

    expect(result).toBe(scene)
  })

  it('applies transforms in order', () => {
    const scene = makeRoot('root')
    const sequence: string[] = []

    const first: SceneTransform = current => {
      sequence.push('first')
      return { ...current, id: `${current.id}:1` }
    }
    const second: SceneTransform = current => {
      sequence.push('second')
      return { ...current, id: `${current.id}:2` }
    }

    const result = applySceneTransforms(scene, [first, second])

    expect(sequence).toEqual(['first', 'second'])
    expect(result.id).toBe('root:1:2')
  })

  it('pipes each transform output into the next transform input', () => {
    const scene = makeRoot('root')

    const withChild: SceneTransform = current => ({
      ...current,
      children: [
        ...current.children,
        { kind: SceneNodeKind.RECT, id: 'injected', x: 0, y: 0, width: 1, height: 1 },
      ],
    })

    const countChildren: SceneTransform = current => ({
      ...current,
      id: `children:${current.children.length}`,
    })

    const result = applySceneTransforms(scene, [withChild, countChildren])

    expect(result.id).toBe('children:1')
  })

  it('throws in development when a transform returns a non-group root', () => {
    const scene = makeRoot('root')

    const invalidTransform: SceneTransform = () => ({
      kind: SceneNodeKind.PATH,
      id: 'invalid-root',
      d: 'M 0 0 L 1 1',
    })

    expect(() => applySceneTransforms(scene, [invalidTransform])).toThrow(
      'SceneTransform must return a GROUP root node'
    )
  })
})
