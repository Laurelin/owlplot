import { computeChartScene, approximateMeasureText } from '@owlplot/core'
import { renderSvgScene, type LegendOptions } from '@owlplot/renderer-svg'
import type { ChartDemo, RenderOptions } from './types'
import { applySceneTransforms } from './sceneTransforms'

// Sizing token - exported for future use (small multiples, responsive, export)
export const DEFAULT_CHART_SIZE = {
  width: 640,
  height: 358,
} as const

const MAX_CHART_WIDTH = 1200
const CHART_ASPECT_RATIO = 0.56

const hiddenSeriesIdsByContainer = new WeakMap<HTMLElement, string[]>()

function resolveChartSize(container: HTMLElement): { width: number; height: number } {
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
    typeof demoLegend === 'object' && demoLegend != null ? { ...demoLegend } : {}
  return {
    ...base,
    hiddenSeriesIds,
    onToggleSeries,
  }
}

export function renderChartInto(container: HTMLElement, demo: ChartDemo): void {
  const hiddenSeriesIds = hiddenSeriesIdsByContainer.get(container) ?? []
  container.replaceChildren()

  const size = resolveChartSize(container)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(size.width))
  svg.setAttribute('height', String(size.height))
  svg.classList.add('chart-svg')
  container.appendChild(svg)

  const config = {
    ...demo.config,
    options: {
      ...demo.config.options,
      hiddenSeriesIds,
    },
  }

  const result = computeChartScene(config, size, {
    devicePixelRatio: window.devicePixelRatio || 1,
    measureText: approximateMeasureText,
  })
  const baseScene = result.scene
  const scene = applySceneTransforms(baseScene, demo.sceneTransforms)

  const legend = mergeLegendOptions(
    demo.renderOptions?.legend,
    hiddenSeriesIds,
    (seriesId: string) => {
      const current = hiddenSeriesIdsByContainer.get(container) ?? []
      const next = current.includes(seriesId)
        ? current.filter(id => id !== seriesId)
        : [...current, seriesId]
      hiddenSeriesIdsByContainer.set(container, next)
      renderChartInto(container, demo)
    }
  )

  renderSvgScene(scene, svg, {
    tooltip: demo.renderOptions?.tooltip,
    tooltipContext: {
      ...demo.renderOptions?.tooltipContext,
      tooltipFormat: demo.config.options?.tooltipFormat,
      locale: demo.config.options?.locale,
    },
    hoverMode: demo.renderOptions?.hoverMode,
    hoverIndicator: demo.renderOptions?.hoverIndicator,
    legend,
    legendHost: container,
  })
}
