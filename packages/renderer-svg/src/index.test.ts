import { JSDOM } from 'jsdom'
import { ChartKind, computeChartScene } from '@owlplot/core'
import { renderSvgScene } from '../src/index'
import { expect, it, beforeEach } from 'vitest'

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  })
  // Set up global document and SVG types for createSvgElement
  ;(global as any).window = dom.window
  ;(global as any).document = dom.window.document
  ;(global as any).SVGSVGElement = dom.window.SVGSVGElement
  ;(global as any).SVGElement = dom.window.SVGElement
  ;(global as any).Element = dom.window.Element
})

it('renders a line path', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '200')
  svg.setAttribute('height', '100')
  const result = computeChartScene(
    {
      kind: ChartKind.LINE,
      series: [
        {
          id: 's',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    },
    { width: 200, height: 100 },
    { devicePixelRatio: 1, measureText: () => ({ width: 0, height: 0 }) }
  )
  renderSvgScene(result.scene, svg)

  expect(svg.innerHTML).toContain('<path')
})
