import {
  computeChartScene,
  approximateMeasureText,
} from '@owlplot/core'
import { renderSvgScene } from '@owlplot/renderer-svg'
import type { ChartDemo } from './types'

// Sizing token - exported for future use (small multiples, responsive, export)
export const DEFAULT_CHART_SIZE = {
  width: 600,
  height: 300,
} as const

export function renderChartInto(
  container: HTMLElement,
  demo: ChartDemo
): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(DEFAULT_CHART_SIZE.width))
  svg.setAttribute('height', String(DEFAULT_CHART_SIZE.height))
  svg.classList.add('chart-svg')

  const result = computeChartScene(
    demo.config,
    { width: DEFAULT_CHART_SIZE.width, height: DEFAULT_CHART_SIZE.height },
    {
      devicePixelRatio: window.devicePixelRatio || 1,
      measureText: approximateMeasureText,
    }
  )

  renderSvgScene(result.scene, svg, demo.renderOptions)
  container.appendChild(svg)
}
