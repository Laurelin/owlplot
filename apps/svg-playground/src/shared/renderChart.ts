import { computeChartScene } from '@owlplot/core'
import {
  createCanvasMeasureText,
  renderSvgScene,
  type LegendOptions,
} from '@owlplot/renderer-svg'
import type { ChartDemo, RenderOptions } from './types'
import { applySceneTransforms } from './sceneTransforms'

// Browser: canvas MeasureText. Node/tests keep approximateMeasureText from core.
const measureText = createCanvasMeasureText()

// Sizing token - exported for future use (small multiples, responsive, export)
export const DEFAULT_CHART_SIZE = {
  width: 640,
  height: 358,
} as const

const MAX_CHART_WIDTH = 1200
const CHART_ASPECT_RATIO = 0.56

const hiddenSeriesIdsByContainer = new WeakMap<HTMLElement, string[]>()

type ChartSize = {
  readonly width: number
  readonly height: number
}

function resolveChartSize(container: HTMLElement): {
  width: number
  height: number
} {
  const alignHost =
    (container.closest('.chart-plot-align') as HTMLElement | null) ?? container
  const containerWidth = alignHost.clientWidth || DEFAULT_CHART_SIZE.width
  const width = Math.min(
    MAX_CHART_WIDTH,
    Math.max(DEFAULT_CHART_SIZE.width, Math.floor(containerWidth))
  )
  const height = Math.round(width * CHART_ASPECT_RATIO)
  return { width, height }
}

function mergeLegendOptions(
  demoLegend: RenderOptions['legend'],
  hiddenSeriesIds: readonly string[],
  onToggleSeries: (seriesId: string) => void
): LegendOptions | boolean | null {
  if (demoLegend === null || demoLegend === false) return demoLegend
  const base: LegendOptions =
    typeof demoLegend === 'object' && demoLegend != null
      ? { ...demoLegend }
      : {}
  return {
    ...base,
    hiddenSeriesIds,
    onToggleSeries,
  }
}

function getHiddenSeriesIds(container: HTMLElement): readonly string[] {
  return hiddenSeriesIdsByContainer.get(container) ?? []
}

function toggleSeriesId(
  hiddenSeriesIds: readonly string[],
  seriesId: string
): string[] {
  return hiddenSeriesIds.includes(seriesId)
    ? hiddenSeriesIds.filter(id => id !== seriesId)
    : [...hiddenSeriesIds, seriesId]
}

function createToggleSeriesHandler(
  container: HTMLElement,
  demo: ChartDemo
): (seriesId: string) => void {
  return seriesId => {
    const current = getHiddenSeriesIds(container)
    hiddenSeriesIdsByContainer.set(container, toggleSeriesId(current, seriesId))
    renderChartInto(container, demo)
  }
}

function createChartSvg(
  container: HTMLElement,
  size: ChartSize
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(size.width))
  svg.setAttribute('height', String(size.height))
  svg.classList.add('chart-svg')
  container.appendChild(svg)
  return svg
}

function computeTransformedScene(
  demo: ChartDemo,
  size: ChartSize,
  hiddenSeriesIds: readonly string[]
) {
  const config = {
    ...demo.config,
    options: {
      ...demo.config.options,
      hiddenSeriesIds,
    },
  }
  const result = computeChartScene(config, size, {
    devicePixelRatio: window.devicePixelRatio || 1,
    measureText,
  })
  return applySceneTransforms(result.scene, demo.sceneTransforms)
}

export function renderChartInto(container: HTMLElement, demo: ChartDemo): void {
  const hiddenSeriesIds = getHiddenSeriesIds(container)
  const renderOptions = demo.renderOptions ?? {}
  const chartOptions = demo.config.options ?? {}
  container.replaceChildren()

  const size = resolveChartSize(container)
  const svg = createChartSvg(container, size)
  const scene = computeTransformedScene(demo, size, hiddenSeriesIds)
  const legend = mergeLegendOptions(
    renderOptions.legend,
    hiddenSeriesIds,
    createToggleSeriesHandler(container, demo)
  )

  renderSvgScene(scene, svg, {
    tooltip: renderOptions.tooltip,
    tooltipContext: {
      ...renderOptions.tooltipContext,
      tooltipFormat: chartOptions.tooltipFormat,
      locale: chartOptions.locale,
    },
    hoverMode: renderOptions.hoverMode,
    hoverIndicator: renderOptions.hoverIndicator,
    legend,
    legendHost: container,
  })
}
