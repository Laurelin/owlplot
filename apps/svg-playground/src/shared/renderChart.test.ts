import { JSDOM } from 'jsdom'
import { ChartKind, SceneNodeKind, type SceneNode } from '@owlplot/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChartDemo, RenderOptions } from './types'

const mocks = vi.hoisted(() => ({
  computeChartScene: vi.fn(),
  renderSvgScene: vi.fn(),
}))

vi.mock('@owlplot/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@owlplot/core')>()),
  computeChartScene: mocks.computeChartScene,
}))

vi.mock('@owlplot/renderer-svg', async importOriginal => ({
  ...(await importOriginal<typeof import('@owlplot/renderer-svg')>()),
  renderSvgScene: mocks.renderSvgScene,
}))

import { renderChartInto } from './renderChart'

function makeScene(id = 'computed'): SceneNode {
  return { kind: SceneNodeKind.GROUP, id, children: [] }
}

function makeDemo(legend?: RenderOptions['legend']): ChartDemo {
  return {
    id: 'demo',
    title: 'Demo',
    description: 'Render test',
    purpose: 'interaction-model',
    config: {
      kind: ChartKind.LINE,
      series: [],
      options: {},
    },
    sceneTransforms: [scene => ({ ...scene, id: 'transformed' })],
    renderOptions: { legend },
  }
}

beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://example.test/',
  })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.SVGSVGElement = dom.window.SVGSVGElement
  mocks.computeChartScene.mockReset()
  mocks.renderSvgScene.mockReset()
  mocks.computeChartScene.mockReturnValue({ scene: makeScene() })
})

describe('renderChartInto', () => {
  it('computes, transforms, and renders a default-sized chart', () => {
    const container = document.createElement('div')

    renderChartInto(container, makeDemo(true))

    expect(mocks.computeChartScene).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ hiddenSeriesIds: [] }),
      }),
      { width: 640, height: 358 },
      expect.objectContaining({ devicePixelRatio: 1 })
    )
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('640')
    expect(svg?.classList.contains('chart-svg')).toBe(true)
    expect(mocks.renderSvgScene).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'transformed' }),
      svg,
      expect.objectContaining({
        legend: expect.objectContaining({ hiddenSeriesIds: [] }),
        legendHost: container,
      })
    )
  })

  it('uses the capped alignment-host width', () => {
    const host = document.createElement('div')
    host.className = 'chart-plot-align'
    Object.defineProperty(host, 'clientWidth', { value: 1500 })
    const container = document.createElement('div')
    host.appendChild(container)

    renderChartInto(container, makeDemo())

    expect(mocks.computeChartScene.mock.calls[0]?.[1]).toEqual({
      width: 1200,
      height: 672,
    })
  })

  it('preserves explicit disabled legend modes', () => {
    const nullContainer = document.createElement('div')
    renderChartInto(nullContainer, makeDemo(null))
    expect(mocks.renderSvgScene.mock.calls[0]?.[2].legend).toBeNull()

    const falseContainer = document.createElement('div')
    renderChartInto(falseContainer, makeDemo(false))
    expect(mocks.renderSvgScene.mock.calls[1]?.[2].legend).toBe(false)
  })

  it('merges legend options and toggles hidden series state', () => {
    const container = document.createElement('div')
    const demo = makeDemo({ padding: 8 })
    renderChartInto(container, demo)

    const firstLegend = mocks.renderSvgScene.mock.calls[0]?.[2].legend
    expect(firstLegend).toEqual(
      expect.objectContaining({ padding: 8, hiddenSeriesIds: [] })
    )
    if (typeof firstLegend !== 'object' || firstLegend == null) {
      throw new Error('Expected interactive legend options')
    }
    firstLegend.onToggleSeries?.('revenue')

    expect(mocks.computeChartScene.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({ hiddenSeriesIds: ['revenue'] }),
      })
    )
    const secondLegend = mocks.renderSvgScene.mock.calls[1]?.[2].legend
    if (typeof secondLegend !== 'object' || secondLegend == null) {
      throw new Error('Expected interactive legend options')
    }
    secondLegend.onToggleSeries?.('revenue')

    expect(mocks.computeChartScene.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({ hiddenSeriesIds: [] }),
      })
    )
  })
})
