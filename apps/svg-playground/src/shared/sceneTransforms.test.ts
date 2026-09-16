import { describe, expect, it } from 'vitest'
import { SceneNodeKind, type SceneNode } from '@owlplot/core'
import {
  applySceneTransforms,
  dropSeriesNodes,
  nodeBelongsToSeries,
  type SceneTransform,
} from './sceneTransforms'
import { transformCharts } from '../charts/transforms'

function makeRoot(id: string): SceneNode {
  return {
    kind: SceneNodeKind.GROUP,
    id,
    children: [],
  }
}

function makeRootWithChild(child: SceneNode): SceneNode {
  return {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [child],
  }
}

describe('applySceneTransforms', () => {
  it('returns the same scene reference when no transforms are provided', () => {
    const scene = makeRoot('root')

    const result = applySceneTransforms(scene)

    expect(result).toBe(scene)
    expect(applySceneTransforms(scene, [])).toBe(scene)
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
        {
          kind: SceneNodeKind.RECT,
          id: 'injected',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
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

describe('nodeBelongsToSeries', () => {
  it('recognizes series paths, fills, point ids, and point metadata', () => {
    expect(
      nodeBelongsToSeries(
        { kind: SceneNodeKind.PATH, id: 'series:revenue', d: '' },
        'revenue'
      )
    ).toBe(true)
    expect(
      nodeBelongsToSeries(
        { kind: SceneNodeKind.PATH, id: 'series-fill:revenue', d: '' },
        'revenue'
      )
    ).toBe(true)
    expect(
      nodeBelongsToSeries(
        { kind: SceneNodeKind.PATH, id: 'point:revenue:3', d: '' },
        'revenue'
      )
    ).toBe(true)
    expect(
      nodeBelongsToSeries(
        {
          kind: SceneNodeKind.POINT,
          id: 'custom-point',
          seriesId: 'revenue',
          x: 0,
          y: 1,
          point: { shape: { kind: 'circle' }, size: 3 },
        },
        'revenue'
      )
    ).toBe(true)
  })

  it('rejects nodes belonging to another series', () => {
    expect(
      nodeBelongsToSeries(
        { kind: SceneNodeKind.PATH, id: 'series:expenses', d: '' },
        'revenue'
      )
    ).toBe(false)
  })
})

describe('dropSeriesNodes', () => {
  it('drops series path, fill, and point nodes for the given series id', () => {
    const scene: SceneNode = {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children: [
        {
          kind: SceneNodeKind.PATH,
          id: 'series:revenue',
          d: 'M 0 0',
        },
        {
          kind: SceneNodeKind.PATH,
          id: 'series:expenses',
          d: 'M 1 1',
        },
        {
          kind: SceneNodeKind.PATH,
          id: 'series-fill:expenses',
          d: 'M 2 2',
        },
        {
          kind: SceneNodeKind.POINT,
          id: 'point:expenses:0',
          seriesId: 'expenses',
          x: 0,
          y: 1,
          point: { shape: { kind: 'circle' }, size: 3 },
        },
        {
          kind: SceneNodeKind.POINT,
          id: 'point:revenue:0',
          seriesId: 'revenue',
          x: 0,
          y: 2,
          point: { shape: { kind: 'circle' }, size: 3 },
        },
      ],
    }

    const result = dropSeriesNodes('expenses')(scene)

    expect(result.kind).toBe(SceneNodeKind.GROUP)
    expect(result.children.map(child => child.id)).toEqual([
      'series:revenue',
      'point:revenue:0',
    ])
  })

  it('filters nested groups while preserving a matching root', () => {
    const nested: SceneNode = {
      kind: SceneNodeKind.GROUP,
      id: 'nested',
      children: [
        { kind: SceneNodeKind.PATH, id: 'series:expenses', d: '' },
        { kind: SceneNodeKind.PATH, id: 'series:revenue', d: '' },
      ],
    }
    const root: SceneNode = {
      kind: SceneNodeKind.GROUP,
      id: 'series:expenses',
      children: [nested],
    }

    expect(dropSeriesNodes('expenses')(root)).toBe(root)

    const transformed = dropSeriesNodes('expenses')(makeRootWithChild(nested))
    expect(transformed.children[0]?.kind).toBe(SceneNodeKind.GROUP)
    expect(
      transformed.children[0]?.kind === SceneNodeKind.GROUP
        ? transformed.children[0].children.map(child => child.id)
        : []
    ).toEqual(['series:revenue'])
  })
})

describe('scene-transform demo wiring', () => {
  it('wires dropSeriesNodes into sceneTransforms on the drop-series demo', () => {
    const demo = transformCharts.find(
      entry => entry.id === 'scene-transform-drop-series'
    )
    expect(demo).toBeDefined()
    expect(demo?.sceneTransforms).toHaveLength(1)

    const scene: SceneNode = {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children: [
        { kind: SceneNodeKind.PATH, id: 'series:revenue', d: 'M 0 0' },
        { kind: SceneNodeKind.PATH, id: 'series:expenses', d: 'M 1 1' },
      ],
    }
    const transformed = applySceneTransforms(scene, demo?.sceneTransforms)
    expect(transformed.children.map(child => child.id)).toEqual([
      'series:revenue',
    ])
  })
})
