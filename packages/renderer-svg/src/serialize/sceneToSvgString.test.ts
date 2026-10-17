/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import {
  ChartKind,
  SceneNodeKind,
  computeChartScene,
  approximateMeasureText,
  type ChartConfig,
  type SceneNode,
} from '@owlplot/core'
import { sceneToSvgString } from './sceneToSvgString'

const env = { devicePixelRatio: 2, measureText: approximateMeasureText }
const size = { width: 640, height: 360 }

function findById(node: SceneNode, id: string): SceneNode | undefined {
  if (node.id === id) return node
  if (node.kind === SceneNodeKind.GROUP) {
    for (const child of node.children) {
      const found = findById(child, id)
      if (found) return found
    }
  }
  return undefined
}

function collectByKind(
  node: SceneNode,
  kind: SceneNodeKind,
  out: SceneNode[] = []
): SceneNode[] {
  if (node.kind === kind) out.push(node)
  if (node.kind === SceneNodeKind.GROUP) {
    for (const child of node.children) collectByKind(child, kind, out)
  }
  return out
}

describe('sceneToSvgString', () => {
  it('runs without document (node environment)', () => {
    expect(typeof document).toBe('undefined')
  })

  it('serializes a line chart scene to SVG markup (snapshot)', () => {
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

    const { scene } = computeChartScene(config, size, env)
    const svg = sceneToSvgString(scene, size)

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('width="640"')
    expect(svg).toContain('height="360"')
    expect(svg).toMatchSnapshot()
  })

  it('spot-check: path d and text positions match scene (interactive parity)', () => {
    const config: ChartConfig = {
      kind: ChartKind.LINE,
      series: [
        {
          id: 's',
          points: [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 1.5 },
          ],
        },
      ],
      options: { showPoints: true, padding: { left: 40, bottom: 40 } },
    }

    const { scene } = computeChartScene(config, size, env)
    const svg = sceneToSvgString(scene, size)

    const paths = collectByKind(scene, SceneNodeKind.PATH)
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      if (path.kind !== SceneNodeKind.PATH) continue
      expect(svg).toContain(`d="${path.d}"`)
    }

    const texts = collectByKind(scene, SceneNodeKind.TEXT)
    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) {
      if (text.kind !== SceneNodeKind.TEXT) continue
      expect(svg).toContain(`x="${text.x}"`)
      expect(svg).toContain(`y="${text.y}"`)
      expect(svg).toContain(`>${text.text}</text>`)
    }

    // Realized POINT marks appear as circles with ids from the scene
    const points = collectByKind(scene, SceneNodeKind.POINT)
    expect(points.length).toBeGreaterThan(0)
    for (const point of points) {
      expect(svg).toContain(`id="${point.id}"`)
    }

    const seriesPath = findById(scene, 'series:s')
    expect(seriesPath?.kind).toBe(SceneNodeKind.PATH)
    if (seriesPath?.kind === SceneNodeKind.PATH) {
      expect(svg).toContain(`id="series:s"`)
      expect(svg).toContain(`d="${seriesPath.d}"`)
    }
  })

  it('escapes XML special characters in text', () => {
    const scene: SceneNode = {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children: [
        {
          kind: SceneNodeKind.TEXT,
          id: 'label',
          x: 10,
          y: 20,
          text: 'A & B <C>',
        },
      ],
    }
    const svg = sceneToSvgString(scene, { width: 100, height: 50 })
    expect(svg).toContain('A &amp; B &lt;C&gt;')
    expect(svg).not.toContain('A & B <C>')
  })

  it('serializes every realized point shape', () => {
    const scale = {
      type: 'linear' as const,
      domain: [0, 10] as [number, number],
      range: [0, 100] as [number, number],
    }
    const shapes = [
      { kind: 'circle' as const },
      { kind: 'square' as const },
      { kind: 'triangle' as const },
      { kind: 'diamond' as const },
      { kind: 'emoji' as const, value: '🦉' },
      { kind: 'symbol' as const, name: 'future' },
    ]
    const scene: SceneNode = {
      kind: SceneNodeKind.GROUP,
      id: 'root',
      children: [
        ...shapes.map((shape, index) => ({
          kind: SceneNodeKind.POINT,
          id: `point:s:${index}`,
          seriesId: 's',
          datumIndex: index,
          x: index,
          y: index,
          point: { shape, size: 4 },
        })),
        {
          kind: SceneNodeKind.POINT,
          id: 'point:missing:0',
          datumIndex: 0,
          x: 7,
          y: 7,
          point: { shape: { kind: 'circle' }, size: 4 },
        },
      ],
      metadata: {
        hover: {
          scales: { x: scale, y: scale },
          plotRect: { x: 0, y: 0, width: 100, height: 100 },
          xDomain: [0, 10],
          yDomain: [0, 10],
          series: [{ id: 's', yAxis: 'left', sortedPoints: [] }],
        },
      },
    }

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const svg = sceneToSvgString(scene, { width: 100, height: 100 })
    warn.mockRestore()

    expect(svg).toContain('<circle id="point:s:0"')
    expect(svg).toContain('<rect id="point:s:1"')
    expect(svg).toContain('<path id="point:s:2"')
    expect(svg).toContain('<path id="point:s:3"')
    expect(svg).toContain('<text id="point:s:4"')
    expect(svg).toContain('<circle id="point:s:5"')
    expect(svg).not.toContain('point:missing:0')
  })

  it('skips point nodes that cannot be resolved', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const withoutContext: SceneNode = {
      kind: SceneNodeKind.POINT,
      id: 'point:s:0',
      seriesId: 's',
      datumIndex: 0,
      x: 1,
      y: 1,
      point: { shape: { kind: 'circle' }, size: 4 },
    }

    expect(
      sceneToSvgString(withoutContext, { width: 100, height: 100 })
    ).not.toContain('point:s:0')
    expect(warn).toHaveBeenCalledWith(
      '[owlplot] ScenePointNode requires render context with scales and seriesYAxis; skipping point.'
    )
    warn.mockRestore()
  })
})
