import { describe, expect, it } from 'vitest'
import { SceneNodeKind, type SceneNode } from '@owlplot/core'
import {
  injectBigOWedgeBackgroundTransform,
  styleBigOPosterTransform,
} from './bigOTransforms'
import { complexityCharts } from './complexity'

function makeScene(): SceneNode {
  return {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    metadata: {
      hover: {
        plotRect: { x: 10, y: 20, width: 80, height: 60 },
      },
    },
    children: [
      {
        kind: SceneNodeKind.RECT,
        id: 'background',
        x: 0,
        y: 0,
        width: 120,
        height: 100,
        metadata: { role: 'background' },
      },
      {
        kind: SceneNodeKind.PATH,
        id: 'series:O(n)',
        d: 'M 10 80 L 90 20',
      },
      {
        kind: SceneNodeKind.PATH,
        id: 'axis-line:left',
        d: 'M 10 20 L 10 80',
      },
    ],
  }
}

function extractPathPoints(d: string): Array<{ x: number; y: number }> {
  const numbers = d
    .trim()
    .split(/[^\d.\-]+/)
    .filter(token => token.length > 0)
    .map(value => Number(value))
  const points: Array<{ x: number; y: number }> = []
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push({ x: numbers[i]!, y: numbers[i + 1]! })
  }
  return points
}

describe('bigO transforms', () => {
  it('inserts wedges after background and before series', () => {
    const scene = makeScene()
    const transformed = injectBigOWedgeBackgroundTransform(scene)
    expect(transformed.kind).toBe(SceneNodeKind.GROUP)
    if (transformed.kind !== SceneNodeKind.GROUP) return

    const backgroundIndex = transformed.children.findIndex(
      child => child.id === 'background'
    )
    const firstWedgeIndex = transformed.children.findIndex(child =>
      child.id.startsWith('bigO:wedge:')
    )
    const seriesIndex = transformed.children.findIndex(child =>
      child.id.startsWith('series:')
    )

    expect(backgroundIndex).toBe(0)
    expect(firstWedgeIndex).toBeGreaterThan(backgroundIndex)
    expect(seriesIndex).toBeGreaterThan(firstWedgeIndex)
  })

  it('keeps wedge points inside plot rect', () => {
    const scene = makeScene()
    const transformed = injectBigOWedgeBackgroundTransform(scene)
    expect(transformed.kind).toBe(SceneNodeKind.GROUP)
    if (transformed.kind !== SceneNodeKind.GROUP) return

    const plotRect = { x: 10, y: 20, width: 80, height: 60 }
    const minX = plotRect.x
    const maxX = plotRect.x + plotRect.width
    const minY = plotRect.y
    const maxY = plotRect.y + plotRect.height

    const wedges = transformed.children.filter(
      child =>
        child.kind === SceneNodeKind.PATH && child.id.startsWith('bigO:wedge:')
    )

    expect(wedges.length).toBeGreaterThan(0)
    for (const wedge of wedges) {
      if (wedge.kind !== SceneNodeKind.PATH) continue
      const points = extractPathPoints(wedge.d)
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(minX)
        expect(point.x).toBeLessThanOrEqual(maxX)
        expect(point.y).toBeGreaterThanOrEqual(minY)
        expect(point.y).toBeLessThanOrEqual(maxY)
      }
    }
  })

  it('is idempotent when wedges are already injected', () => {
    const once = injectBigOWedgeBackgroundTransform(makeScene())
    const twice = injectBigOWedgeBackgroundTransform(once)
    expect(twice).toBe(once)
  })

  it('applies poster stroke styling to series paths', () => {
    const transformed = styleBigOPosterTransform(makeScene())
    expect(transformed.kind).toBe(SceneNodeKind.GROUP)
    if (transformed.kind !== SceneNodeKind.GROUP) return

    const series = transformed.children.find(child => child.id === 'series:O(n)')
    expect(series?.kind).toBe(SceneNodeKind.PATH)
    if (series?.kind !== SceneNodeKind.PATH) return
    expect(series.style?.strokeWidth).toBe(1.8)
  })
})

describe('complexity poster preset', () => {
  it('normalizes poster series into [0, 1] y-domain with stable rank offsets', () => {
    const poster = complexityCharts.find(chart => chart.id === 'big-o-complexity-poster')
    expect(poster).toBeDefined()
    const series = poster?.config.series ?? []
    expect(series.length).toBeGreaterThan(0)

    let previousMax = -Infinity
    for (const current of series) {
      const yValues = current.points
        .map(point => point.y)
        .filter((value): value is number => value != null)
      expect(yValues.length).toBeGreaterThan(0)

      const minY = Math.min(...yValues)
      const maxY = Math.max(...yValues)
      expect(minY).toBeGreaterThanOrEqual(0)
      expect(maxY).toBeLessThanOrEqual(1)
      expect(minY).toBeGreaterThanOrEqual(previousMax - 1e-9)
      previousMax = maxY
    }
  })
})

