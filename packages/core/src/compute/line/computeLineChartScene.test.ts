import { describe, expect, it } from 'vitest'
import { ChartConfig, ChartKind } from '../../config/types'
import { computeChartScene } from '../computeChartScene'
import { approximateMeasureText } from '../../text/helpers'

function getYDomain(result: {
  scene: { metadata?: { hover?: { yDomain?: [number, number] } } }
}): [number, number] | undefined {
  return result.scene.metadata?.hover?.yDomain
}

function getDualYDomains(result: {
  scene: {
    metadata?: {
      hover?: {
        yDomainLeft?: [number, number]
        yDomainRight?: [number, number]
      }
    }
  }
}): { left?: [number, number]; right?: [number, number] } {
  return {
    left: result.scene.metadata?.hover?.yDomainLeft,
    right: result.scene.metadata?.hover?.yDomainRight,
  }
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

type TestSceneNode = {
  id?: string
  kind?: string
  x?: number
  y?: number
  width?: number
  height?: number
  style?: { fillOpacity?: number }
  children?: TestSceneNode[]
}

function findSceneNodeById(
  node: TestSceneNode,
  id: string
): TestSceneNode | undefined {
  if (node.id === id) return node
  if (!Array.isArray(node.children)) return undefined
  for (const child of node.children) {
    const found = findSceneNodeById(child, id)
    if (found) return found
  }
  return undefined
}

function rootChildren(result: { scene: { children?: TestSceneNode[] } }) {
  return result.scene.children ?? []
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

    it('mode data includes area baseline even when all y values are null', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'area',
            type: 'area',
            baseline: 42,
            points: [
              { x: 0, y: null },
              { x: 1, y: null },
            ],
          },
        ],
        options: { yDomain: { mode: 'data' } },
      }
      const result = computeChartScene(config, size, env)
      const yDomain = getYDomain(result)
      expect(yDomain).toEqual([42, 43])
    })

    it('dual-scale keeps area baseline isolated to the correct side domain', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'left-area',
            type: 'area',
            baseline: -10,
            points: [
              { x: 0, y: null },
              { x: 1, y: null },
            ],
          },
          {
            id: 'right-line',
            yAxis: 'right',
            points: [
              { x: 0, y: 100 },
              { x: 1, y: 120 },
            ],
          },
        ],
        options: {
          yDomain: { mode: 'data' },
          yAxisRight: { tickCount: 5 },
        },
      }
      const result = computeChartScene(config, size, env)
      const domains = getDualYDomains(result)
      expect(domains.left).toEqual([-10, -9])
      expect(domains.right).toEqual([100, 120])
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

    it('keeps zero ticks when zero is inside the domain (negative to positive)', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: -2, y: -2 },
              { x: -1, y: -1 },
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
      expect(ids).toContain('axis-tick:bottom:2')
      expect(ids).toContain('axis-tick-label:bottom:2')
      expect(ids).toContain('axis-tick:left:2')
      expect(ids).toContain('axis-tick-label:left:2')
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

    it('uses fill paint for area legend swatches before stroke fallback', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'area',
            type: 'area',
            paint: {
              fill: { type: 'solid', color: '#112233' },
              stroke: { type: 'solid', color: '#abcdef' },
            },
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 3 },
            ],
          },
        ],
      }

      const result = computeChartScene(config, size, env)
      const entries = getLegendEntries(result)
      expect(entries?.[0]?.paint).toEqual({ type: 'solid', color: '#112233' })
    })
  })

  describe('area fill opacity', () => {
    const env = { devicePixelRatio: 2, measureText: approximateMeasureText }
    const size = { width: 640, height: 360 }

    it('applies chart-level area fill opacity by default', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'area',
            type: 'area',
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 3 },
            ],
          },
        ],
        options: { area: { fillOpacity: 0.4 } },
      }

      const result = computeChartScene(config, size, env)
      const fillNode = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'series-fill:area'
      )
      expect(fillNode?.style?.fillOpacity).toBe(0.4)
    })

    it('series-level area fill opacity overrides chart-level value', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'area',
            type: 'area',
            fillOpacity: 0.7,
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 3 },
            ],
          },
        ],
        options: { area: { fillOpacity: 0.4 } },
      }

      const result = computeChartScene(config, size, env)
      const fillNode = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'series-fill:area'
      )
      expect(fillNode?.style?.fillOpacity).toBe(0.7)
    })

    it('omits fillOpacity when resolved opacity is 1', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'area',
            type: 'area',
            fillOpacity: 1,
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 3 },
            ],
          },
        ],
      }

      const result = computeChartScene(config, size, env)
      const fillNode = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'series-fill:area'
      )
      expect(fillNode?.style?.fillOpacity).toBeUndefined()
    })

    it('never attaches fillOpacity to line stroke nodes', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'area',
            type: 'area',
            fillOpacity: 0.6,
            points: [
              { x: 0, y: 1 },
              { x: 1, y: 3 },
            ],
          },
          {
            id: 'line',
            points: [
              { x: 0, y: 2 },
              { x: 1, y: 4 },
            ],
          },
        ],
      }

      const result = computeChartScene(config, size, env)
      const areaStrokeNode = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'series:area'
      )
      const lineStrokeNode = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'series:line'
      )
      expect(areaStrokeNode?.style?.fillOpacity).toBeUndefined()
      expect(lineStrokeNode?.style?.fillOpacity).toBeUndefined()
    })
  })

  describe('horizontal bands', () => {
    const env = { devicePixelRatio: 2, measureText: approximateMeasureText }
    const size = { width: 640, height: 360 }

    it('emits bands before series and axes, preserving config order', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 10 },
            ],
          },
        ],
        options: {
          bands: [
            { yMin: 2, yMax: 4, fill: { type: 'solid', color: '#22c55e' } },
            { yMin: 6, yMax: 8, fill: { type: 'solid', color: '#f59e0b' } },
          ],
        },
      }

      const result = computeChartScene(config, size, env)
      const children = rootChildren(result as unknown as { scene: { children?: TestSceneNode[] } })
      const ids = children.map(node => node.id)

      const band0Index = ids.indexOf('band:0')
      const band1Index = ids.indexOf('band:1')
      const seriesIndex = ids.indexOf('series:s')
      const axisIndex = ids.indexOf('axis-group:bottom')

      expect(band0Index).toBeGreaterThanOrEqual(0)
      expect(band1Index).toBeGreaterThanOrEqual(0)
      expect(seriesIndex).toBeGreaterThanOrEqual(0)
      expect(axisIndex).toBeGreaterThanOrEqual(0)
      expect(band0Index).toBeLessThan(band1Index)
      expect(band1Index).toBeLessThan(seriesIndex)
      expect(seriesIndex).toBeLessThan(axisIndex)
      expect(children[band0Index]?.kind).toBe('rect')
      expect(children[band1Index]?.kind).toBe('rect')
    })

    it('normalizes y bounds, clips to plot rect, and skips fully out-of-range bands', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 10 },
            ],
          },
        ],
        options: {
          bands: [
            { yMin: 8, yMax: 3, fill: { type: 'solid', color: '#60a5fa' } }, // swapped
            { yMin: -5, yMax: 3, fill: { type: 'solid', color: '#10b981' } }, // clipped
            { yMin: 20, yMax: 30, fill: { type: 'solid', color: '#ef4444' } }, // skipped
          ],
        },
      }

      const result = computeChartScene(config, size, env)
      const band0 = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'band:0'
      )
      const band1 = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'band:1'
      )
      const band2 = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'band:2'
      )

      expect(band0).toBeDefined()
      expect(band1).toBeDefined()
      expect(band2).toBeUndefined()
      expect((band0?.height ?? 0) > 0).toBe(true)
      expect((band1?.height ?? 0) > 0).toBe(true)
    })

    it('uses right-side scale when band.yAxis is right', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 'left',
            yAxis: 'left',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 10 },
            ],
          },
          {
            id: 'right',
            yAxis: 'right',
            points: [
              { x: 0, y: 100 },
              { x: 1, y: 200 },
            ],
          },
        ],
        options: {
          yAxisRight: { tickCount: 5 },
          bands: [
            { yMin: 5, yMax: 10, fill: { type: 'solid', color: '#3b82f6' } },
            {
              yMin: 105,
              yMax: 110,
              yAxis: 'right',
              fill: { type: 'solid', color: '#f97316' },
            },
          ],
        },
      }

      const result = computeChartScene(config, size, env)
      const leftBand = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'band:0'
      )
      const rightBand = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'band:1'
      )

      expect(leftBand).toBeDefined()
      expect(rightBand).toBeDefined()
      expect(leftBand?.y).not.toBe(rightBand?.y)
    })

    it('projects bands correctly with log y-scale', () => {
      const config: ChartConfig = {
        kind: ChartKind.LINE,
        series: [
          {
            id: 's',
            points: [
              { x: 1, y: 1 },
              { x: 2, y: 1000 },
            ],
          },
        ],
        options: {
          yScale: { type: 'log', base: 10 },
          yDomain: { mode: 'data' },
          bands: [
            { yMin: 10, yMax: 100, fill: { type: 'solid', color: '#a3e635' } },
          ],
        },
      }

      const result = computeChartScene(config, size, env)
      const band = findSceneNodeById(
        result.scene as unknown as TestSceneNode,
        'band:0'
      )
      const yScale = (
        result.scene.metadata as {
          hover: { scales: { y: { forward: (v: number) => number } } }
        }
      ).hover.scales.y
      const expectedTop = Math.min(yScale.forward(10), yScale.forward(100))
      const expectedBottom = Math.max(yScale.forward(10), yScale.forward(100))

      expect(band).toBeDefined()
      expect(band?.y).toBeCloseTo(expectedTop, 10)
      expect(band?.height).toBeCloseTo(expectedBottom - expectedTop, 10)
    })
  })
})
