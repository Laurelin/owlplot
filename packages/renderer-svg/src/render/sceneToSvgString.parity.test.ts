import { JSDOM } from 'jsdom'
import {
  ChartKind,
  computeChartScene,
  approximateMeasureText,
  type ChartConfig,
} from '@owlplot/core'
import { beforeEach, expect, it } from 'vitest'
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

it('path d and text positions match renderSvgScene for the same scene', () => {
  const size = { width: 640, height: 360 }
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
