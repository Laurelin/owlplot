import { JSDOM } from 'jsdom'
import {
  ChartKind,
  SceneNodeKind,
  computeChartScene,
  approximateMeasureText,
  type ChartConfig,
  type SceneNode,
} from '@owlplot/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderSvgScene } from './renderSvgScene'
import { sceneToSvgString } from '../serialize/sceneToSvgString'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
  SVGSVGElement: typeof SVGSVGElement
  SVGElement: typeof SVGElement
  Element: typeof Element
}

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  })
  testGlobal.window = dom.window
  testGlobal.document = dom.window.document
  testGlobal.SVGSVGElement = dom.window.SVGSVGElement
  testGlobal.SVGElement = dom.window.SVGElement
  testGlobal.Element = dom.window.Element
})

type ChartKindFixture = {
  config: ChartConfig
  size: { width: number; height: number }
}

/**
 * One fixture per chart kind. Keyed by ChartKind so adding a kind
 * without a fixture is a compile error.
 */
const chartKindFixtures: Record<ChartKind, ChartKindFixture> = {
  [ChartKind.LINE]: {
    size: { width: 640, height: 360 },
    config: {
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
    },
  },
}

it('has a parity fixture for every ChartKind', () => {
  expect(Object.keys(chartKindFixtures).sort()).toEqual(
    Object.values(ChartKind).sort()
  )
})

describe('chart kind fixtures', () => {
  for (const [kind, fixture] of Object.entries(chartKindFixtures)) {
    it(`path d and text positions match renderSvgScene for ${kind}`, () => {
      const { size, config } = fixture
      const { scene } = computeChartScene(config, size, {
        devicePixelRatio: 2,
        measureText: approximateMeasureText,
      })

      const markup = sceneToSvgString(scene, size)

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', String(size.width))
      svg.setAttribute('height', String(size.height))
      document.body.appendChild(svg)
      renderSvgScene(scene, svg, { tooltip: null, legend: false })

      for (const path of Array.from(svg.querySelectorAll('path'))) {
        const id = path.getAttribute('id')
        const d = path.getAttribute('d')
        if (!id || !d || id.startsWith('owlplot-')) continue
        expect(markup).toContain(`id="${id}"`)
        expect(markup).toContain(`d="${d}"`)
      }

      for (const text of Array.from(svg.querySelectorAll('text'))) {
        const id = text.getAttribute('id')
        const x = text.getAttribute('x')
        const y = text.getAttribute('y')
        if (!id || x == null || y == null) continue
        expect(markup).toContain(`id="${id}"`)
        expect(markup).toContain(`x="${x}"`)
        expect(markup).toContain(`y="${y}"`)
      }
    })
  }
})

it('throws for an unhandled scene node kind in DOM output', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.appendChild(svg)
  const bogus = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [{ kind: 'bogus', id: 'bogus' }],
  } as unknown as SceneNode
  expect(() =>
    renderSvgScene(bogus, svg, { tooltip: null, legend: false })
  ).toThrow('[createBasicNodeElement] Unexpected value:')
})

it('hand-made scene with every node and paint kind matches DOM output', () => {
  const size = { width: 100, height: 100 }
  const scale = {
    type: 'linear' as const,
    domain: [0, 10] as [number, number],
    range: [0, 100] as [number, number],
  }
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'gradient-path',
        seriesId: 's',
        d: 'M0,0L10,10',
        style: {
          stroke: {
            type: 'linear',
            direction: 'vertical',
            stops: [
              { offset: 0, color: '#111111' },
              { offset: 1, color: '#999999' },
            ],
          },
        },
      },
      {
        kind: SceneNodeKind.RECT,
        id: 'gradient-rect',
        seriesId: 's',
        datumIndex: 2,
        x: 1,
        y: 2,
        width: 10,
        height: 20,
        style: {
          fill: {
            type: 'radial',
            stops: [
              { offset: 0, color: '#ffffff' },
              { offset: 1, color: '#000000' },
            ],
          },
        },
      },
      {
        kind: SceneNodeKind.CIRCLE,
        id: 'solid-circle',
        cx: 5,
        cy: 6,
        r: 3,
        style: { fill: { type: 'solid', color: '#ff0000' } },
      },
      {
        kind: SceneNodeKind.TEXT,
        id: 'label',
        x: 10,
        y: 20,
        text: 'Label',
        transform: { kind: 'translate', x: 1, y: 2 },
      },
      {
        kind: SceneNodeKind.POINT,
        id: 'point:s:0',
        seriesId: 's',
        datumIndex: 0,
        x: 1,
        y: 1,
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

  const markup = sceneToSvgString(scene, size)
  expect(markup).toContain('<defs>')
  expect(markup).toContain('<linearGradient')
  expect(markup).toContain('<radialGradient')
  expect(markup).toContain('stroke="url(#owlplot-grad-')
  expect(markup).toContain('fill="url(#owlplot-grad-')
  expect(markup).toContain('data-owlplot-series-id="s"')
  expect(markup).toContain('data-owlplot-point-index="2"')

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(size.width))
  svg.setAttribute('height', String(size.height))
  document.body.appendChild(svg)
  renderSvgScene(scene, svg, { tooltip: null, legend: false })

  // Same gradient defs and fill/stroke references in both projections.
  for (const gradient of Array.from(
    svg.querySelectorAll('linearGradient, radialGradient')
  )) {
    expect(markup).toContain(`id="${gradient.getAttribute('id')}"`)
  }
  const domPath = svg.querySelector('#gradient-path')
  expect(domPath?.getAttribute('stroke')).toBeTruthy()
  expect(markup).toContain(`stroke="${domPath?.getAttribute('stroke')}"`)
  const domRect = svg.querySelector('#gradient-rect')
  expect(domRect?.getAttribute('fill')).toBeTruthy()
  expect(markup).toContain(`fill="${domRect?.getAttribute('fill')}"`)
  expect(domRect?.getAttribute('data-owlplot-series-id')).toBe('s')
  expect(domRect?.getAttribute('data-owlplot-point-index')).toBe('2')
  expect(markup).toContain('id="point:s:0"')
  expect(svg.querySelector('[id="point:s:0"]')).toBeTruthy()
  const domText = svg.querySelector('#label')
  expect(markup).toContain(`transform="${domText?.getAttribute('transform')}"`)
})
