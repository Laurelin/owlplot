import { describe, expect, it } from 'vitest'
import { ChartConfig, ChartKind } from '../../config/types'
import { computeChartScene } from '../computeChartScene'
import { approximateMeasureText } from '../../text/helpers'

function getYDomain(result: {
  scene: { metadata?: { hover?: { yDomain?: [number, number] } } }
}): [number, number] | undefined {
  return result.scene.metadata?.hover?.yDomain
}

function getLegendEntries(result: {
  scene: {
    metadata?: {
      legend?: {
        entries: Array<{
          seriesId: string
          label: string
          paint: { type: string; color?: string }
          order: number
        }>
      }
    }
  }
}) {
  return result.scene.metadata?.legend?.entries
}

function collectSceneNodeIds(node: {
  id?: string
  children?: unknown[]
}): string[] {
  const ids: string[] = []
  if (node.id) ids.push(node.id)
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      ids.push(
        ...collectSceneNodeIds(child as { id?: string; children?: unknown[] })
      )
    }
  }
  return ids
}

describe('computeChartScene (line)', () => {
  it('produces a deterministic scene graph', () => {
    const config: ChartConfig = {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'a',
          points: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: null },
            { x: 3, y: 1 },
          ],
        },
        {
          id: 'b',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 1.5 },
            { x: 3, y: 2 },
          ],
        },
      ],
      options: { showPoints: true, padding: { left: 40 } },
    }

    const result = computeChartScene(
      config,
      { width: 640, height: 360 },
      { devicePixelRatio: 2, measureText: approximateMeasureText }
    )

    expect(result.scene).toMatchSnapshot()
  })

  describe('yDomain policy', () => {
    const env = { devicePixelRatio: 2, measureText: approximateMeasureText }
    const size = { width: 640, height: 360 }

    it('default (include-zero) extends domain to include 0 when data is above zero', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: 10 },
              { x: 1, y: 15 },
              { x: 2, y: 20 },
            ],
          },
        ],
        options: {},
      }
      const result = computeChartScene(config, size, env)
      const yDomain = getYDomain(result)
      expect(yDomain).toEqual([0, 20])
    })

    it('include-zero extends domain when data is below zero', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: -5 },
              { x: 1, y: -10 },
              { x: 2, y: -2 },
            ],
          },
        ],
        options: { yDomain: { mode: 'include-zero' } },
      }
      const result = computeChartScene(config, size, env)
      const yDomain = getYDomain(result)
      expect(yDomain).toEqual([-10, 0])
    })

    it('mode data uses data extents only', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: 10 },
              { x: 1, y: 15 },
              { x: 2, y: 20 },
            ],
          },
        ],
        options: { yDomain: { mode: 'data' } },
      }
      const result = computeChartScene(config, size, env)
      const yDomain = getYDomain(result)
      expect(yDomain).toEqual([10, 20])
    })

    it('mode fixed uses explicit min/max', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: 10 },
              { x: 1, y: 20 },
            ],
          },
        ],
        options: { yDomain: { mode: 'fixed', min: 0, max: 100 } },
      }
      const result = computeChartScene(config, size, env)
      const yDomain = getYDomain(result)
      expect(yDomain).toEqual([0, 100])
    })
  })

  describe('origin ticks', () => {
    const env = { devicePixelRatio: 2, measureText: approximateMeasureText }
    const size = { width: 640, height: 360 }

    it('default hides tick mark and label at origin when both axes include zero', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
              { x: 2, y: 2 },
            ],
          },
        ],
        options: {},
      }
      const result = computeChartScene(config, size, env)
      const ids = collectSceneNodeIds(
        result.scene as { id?: string; children?: unknown[] }
      )
      expect(ids).not.toContain('axis-tick:bottom:0')
      expect(ids).not.toContain('axis-tick-label:bottom:0')
      expect(ids).not.toContain('axis-tick:left:0')
      expect(ids).not.toContain('axis-tick-label:left:0')
    })

    it('showOriginTicks true shows tick and label at origin', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
              { x: 2, y: 2 },
            ],
          },
        ],
        options: { showOriginTicks: true },
      }
      const result = computeChartScene(config, size, env)
      const ids = collectSceneNodeIds(
        result.scene as { id?: string; children?: unknown[] }
      )
      expect(ids).toContain('axis-tick:bottom:0')
      expect(ids).toContain('axis-tick-label:bottom:0')
      expect(ids).toContain('axis-tick:left:0')
      expect(ids).toContain('axis-tick-label:left:0')
    })

    it('no hiding when x domain does not include zero', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 1, y: 0 },
              { x: 2, y: 1 },
              { x: 3, y: 2 },
            ],
          },
        ],
        options: {},
      }
      const result = computeChartScene(config, size, env)
      const ids = collectSceneNodeIds(
        result.scene as { id?: string; children?: unknown[] }
      )
      // Y axis has 0 in domain; x does not. No origin intersection, so y tick at 0 is drawn.
      expect(ids).toContain('axis-tick:left:0')
      expect(ids).toContain('axis-tick-label:left:0')
    })
  })

  describe('legend metadata', () => {
    const env = { devicePixelRatio: 2, measureText: approximateMeasureText }
    const size = { width: 640, height: 360 }

    it('includes legend entries in series declaration order', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'alpha',
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 2 },
            ],
          },
          {
            id: 'beta',
            points: [
              { x: 0, y: 2 },
              { x: 1, y: 3 },
            ],
          },
        ],
      }

      const result = computeChartScene(config, size, env)
      const entries = getLegendEntries(result)

      expect(entries?.map(entry => entry.seriesId)).toEqual(['alpha', 'beta'])
      expect(entries?.map(entry => entry.order)).toEqual([0, 1])
      expect(entries?.map(entry => entry.label)).toEqual(['alpha', 'beta'])
    })

    it('uses resolved series paint for legend swatches', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'solid',
            color: '#ff0000',
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 2 },
            ],
          },
          {
            id: 'custom',
            paint: { stroke: { type: 'solid', color: '#00aa00' } },
            points: [
              { x: 0, y: 2 },
              { x: 1, y: 3 },
            ],
          },
        ],
      }

      const result = computeChartScene(config, size, env)
      const entries = getLegendEntries(result)
      const byId = new Map(entries?.map(entry => [entry.seriesId, entry.paint]))

      expect(byId.get('solid')).toEqual({ type: 'solid', color: '#ff0000' })
      expect(byId.get('custom')).toEqual({ type: 'solid', color: '#00aa00' })
    })
  })
})
