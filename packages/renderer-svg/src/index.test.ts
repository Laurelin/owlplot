import { JSDOM } from 'jsdom'
import { SceneNodeKind, TooltipKind, type SceneNode } from '@owlplot/core'
import { renderSvgScene } from '../src/index'
import { expect, it, beforeEach, vi } from 'vitest'
import { DATA_LEGEND_ITEM_SERIES_ID } from '../src/shared/dataAttributes'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
  SVGSVGElement: typeof SVGSVGElement
  SVGElement: typeof SVGElement
  Element: typeof Element
}

function scaleDescriptor() {
  return {
    type: 'linear' as const,
    domain: [0, 1] as [number, number],
    range: [0, 1] as [number, number],
  }
}

function parseTranslate(transform: string | null): { x: number; y: number } {
  const match = /translate\(([-\d.]+),([-\d.]+)\)/.exec(transform ?? '')
  if (!match) {
    throw new Error(`Expected translate transform, got: ${transform ?? 'null'}`)
  }
  return { x: Number(match[1]), y: Number(match[2]) }
}

function createChartHost(svg: SVGSVGElement): HTMLDivElement {
  const host = document.createElement('div')
  host.appendChild(svg)
  document.body.appendChild(host)
  return host
}

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  })
  // Set up global document and SVG types for createSvgElement
  testGlobal.window = dom.window
  testGlobal.document = dom.window.document
  testGlobal.SVGSVGElement = dom.window.SVGSVGElement
  testGlobal.SVGElement = dom.window.SVGElement
  testGlobal.Element = dom.window.Element
})

it('renders a line path', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '200')
  svg.setAttribute('height', '100')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series:s',
        d: 'M0,0L100,50',
      },
    ],
  }
  renderSvgScene(scene, svg)

  expect(svg.innerHTML).toContain('<path')
})

it('serializes typed scene transforms for groups and text nodes', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    transform: { kind: 'translate', x: 12, y: 34 },
    children: [
      {
        kind: SceneNodeKind.TEXT,
        id: 'label',
        x: 10,
        y: 20,
        text: 'Axis',
        transform: {
          kind: 'rotate',
          degrees: -45,
          originX: 10,
          originY: 20,
        },
      },
    ],
  }

  renderSvgScene(scene, svg)

  const group = svg.querySelector('[id="root"]') as SVGGElement | null
  const text = svg.querySelector('[id="label"]') as SVGTextElement | null
  expect(group?.getAttribute('transform')).toBe('translate(12,34)')
  expect(text?.getAttribute('transform')).toBe('rotate(-45 10 20)')
})

it('renders fill-opacity for area fill paths', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '200')
  svg.setAttribute('height', '100')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series-fill:s',
        d: 'M0 0 L50 10 L100 0 Z',
        style: {
          fill: { type: 'solid', color: '#ff0000' },
          fillOpacity: 0.3,
          stroke: { type: 'solid', color: 'none' },
        },
      },
    ],
  }
  renderSvgScene(scene, svg)

  const path = svg.querySelector(
    '[id="series-fill:s"]'
  ) as SVGPathElement | null
  expect(path?.getAttribute('fill')).toBe('#ff0000')
  expect(path?.getAttribute('fill-opacity')).toBe('0.3')
})

it('keeps fill-opacity when fill uses a gradient paint', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '200')
  svg.setAttribute('height', '100')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series-fill:g',
        d: 'M0 0 L40 20 L80 0 Z',
        style: {
          fill: {
            type: 'linear',
            direction: 'horizontal',
            stops: [
              { offset: 0, color: '#111111' },
              { offset: 1, color: '#999999' },
            ],
          },
          fillOpacity: 0.35,
          stroke: { type: 'solid', color: 'none' },
        },
      },
    ],
  }
  renderSvgScene(scene, svg)

  const path = svg.querySelector(
    '[id="series-fill:g"]'
  ) as SVGPathElement | null
  expect(path?.getAttribute('fill')?.startsWith('url(#')).toBe(true)
  expect(path?.getAttribute('fill-opacity')).toBe('0.35')
})

it('omits fill-opacity when style.fillOpacity is not provided', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '200')
  svg.setAttribute('height', '100')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series-fill:no-opacity',
        d: 'M0 0 L40 20 L80 0 Z',
        style: {
          fill: { type: 'solid', color: '#444444' },
          stroke: { type: 'solid', color: 'none' },
        },
      },
    ],
  }
  renderSvgScene(scene, svg)

  const path = svg.querySelector(
    '[id="series-fill:no-opacity"]'
  ) as SVGPathElement | null
  expect(path?.hasAttribute('fill-opacity')).toBe(false)
})

it('legend click invokes onToggleSeries without display:none hide', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const host = createChartHost(svg)
  const onToggleSeries = vi.fn()
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series:a',
        d: 'M0,10L100,40',
        style: { stroke: { type: 'solid', color: '#ff0000' } },
      },
      {
        kind: SceneNodeKind.CIRCLE,
        id: 'point:a:0',
        cx: 10,
        cy: 10,
        r: 2,
        metadata: {
          tooltip: {
            kind: TooltipKind.POINT,
            seriesId: 'a',
            values: { a: 1, x: 0 },
            points: [{ seriesId: 'a', x: 0, y: 1 }],
            x: 0,
          },
        },
      },
      {
        kind: SceneNodeKind.PATH,
        id: 'series:b',
        d: 'M0,40L100,10',
        style: { stroke: { type: 'solid', color: '#0000ff' } },
      },
    ],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
          {
            seriesId: 'b',
            label: 'b',
            paint: { type: 'solid', color: '#0000ff' },
            order: 1,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, {
    legendHost: host,
    legend: { onToggleSeries },
  })

  const legendItem = host.querySelector(
    `[${DATA_LEGEND_ITEM_SERIES_ID}="a"]`
  ) as HTMLButtonElement | null
  expect(legendItem).not.toBeNull()

  const seriesPath = svg.querySelector('[id="series:a"]') as SVGElement | null
  expect(seriesPath).not.toBeNull()

  legendItem?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

  expect(onToggleSeries).toHaveBeenCalledTimes(1)
  expect(onToggleSeries).toHaveBeenCalledWith('a')
  expect(seriesPath?.style.display).not.toBe('none')
})

it('dims legend swatch from hiddenSeriesIds options without DOM unload', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const host = createChartHost(svg)
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series:a',
        d: 'M0,10L100,40',
        style: { stroke: { type: 'solid', color: '#ff0000' } },
      },
    ],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, {
    legendHost: host,
    legend: { hiddenSeriesIds: ['a'] },
  })

  const legendItem = host.querySelector(
    `[${DATA_LEGEND_ITEM_SERIES_ID}="a"]`
  ) as HTMLButtonElement | null
  const swatch = legendItem?.querySelector('span') as HTMLElement | null
  expect(swatch?.style.opacity).toBe('0.35')

  const seriesPath = svg.querySelector('[id="series:a"]') as SVGElement | null
  expect(seriesPath?.style.display).not.toBe('none')
})

it('supports disabling legend rendering', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const host = createChartHost(svg)
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series:a',
        d: 'M0,10L100,40',
      },
    ],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, { legend: false, legendHost: host })
  expect(host.querySelector('[data-owlplot-legend-root]')).toBeNull()
  expect(svg.getAttribute('height')).toBe('180')

  renderSvgScene(scene, svg, {
    legend: { placement: 'none' },
    legendHost: host,
  })
  expect(host.querySelector('[data-owlplot-legend-root]')).toBeNull()
  expect(svg.getAttribute('height')).toBe('180')
})

it('reserves footer space for default bottom legend to avoid overlap', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const host = createChartHost(svg)
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series:a',
        d: 'M0,10L100,40',
      },
    ],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, { legendHost: host })
  expect(svg.getAttribute('height')).toBe('180')

  const legendItem = host.querySelector(
    `[${DATA_LEGEND_ITEM_SERIES_ID}="a"]`
  ) as HTMLButtonElement | null
  expect(legendItem).not.toBeNull()
  expect(host.querySelector('[data-owlplot-legend-root]')).not.toBeNull()
})

it('inside legend overlays without changing caller-set svg width/height', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const widthBefore = svg.getAttribute('width')
  const heightBefore = svg.getAttribute('height')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [
      {
        kind: SceneNodeKind.PATH,
        id: 'series:circles',
        d: 'M0,10L100,40',
      },
    ],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'circles',
            label: 'circles',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
        ],
      },
      hover: {
        scales: { x: scaleDescriptor(), y: scaleDescriptor() },
        plotRect: { x: 40, y: 20, width: 220, height: 120 },
        xDomain: [0, 10] as [number, number],
        yDomain: [0, 10] as [number, number],
        series: [{ id: 'circles', yAxis: 'left' as const, sortedPoints: [] }],
      },
    },
  }

  renderSvgScene(scene, svg, {
    legend: {
      placement: 'inside',
      anchor: 'top-right',
      overlapPolicy: 'avoid-frame',
    },
  })

  expect(svg.getAttribute('width')).toBe(widthBefore)
  expect(svg.getAttribute('height')).toBe(heightBefore)
  expect(svg.getAttribute('width')).toBe('300')
  expect(svg.getAttribute('height')).toBe('180')
  const legendRoot = svg.querySelector('[id="legend-root"]')
  expect(legendRoot).not.toBeNull()
  expect(legendRoot?.tagName.toLowerCase()).toBe('g')
  const legendItem = svg.querySelector(
    `[${DATA_LEGEND_ITEM_SERIES_ID}="circles"]`
  ) as SVGGElement | null
  expect(legendItem).not.toBeNull()
  const point = parseTranslate(legendItem?.getAttribute('transform') ?? null)
  // Positioned within plotRect's top-right area.
  expect(point.x).toBeGreaterThanOrEqual(40)
  expect(point.x).toBeLessThanOrEqual(260)
  expect(point.y).toBeGreaterThanOrEqual(20)
  expect(point.y).toBeLessThanOrEqual(140)
})

it('inside svg legend uses deterministic row y placement and optical offset', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '400')
  svg.setAttribute('height', '220')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'linear',
            label: 'linear',
            paint: { type: 'solid', color: '#1d4ed8' },
            order: 0,
          },
          {
            seriesId: 'monotoneX',
            label: 'monotoneX',
            paint: { type: 'solid', color: '#dc2626' },
            order: 1,
          },
          {
            seriesId: 'catmullRom',
            label: 'catmullRom',
            paint: { type: 'solid', color: '#059669' },
            order: 2,
          },
        ],
      },
    },
  }

  createChartHost(svg)
  renderSvgScene(scene, svg, { legend: { placement: 'inside' } })

  const items = Array.from(
    svg.querySelectorAll(`[${DATA_LEGEND_ITEM_SERIES_ID}]`)
  ) as SVGGElement[]
  expect(items.length).toBe(3)

  for (const item of items) {
    const swatch = item.querySelector('rect') as SVGRectElement | null
    const text = item.querySelector('text') as SVGTextElement | null
    expect(swatch).not.toBeNull()
    expect(text).not.toBeNull()
    expect(text?.hasAttribute('dominant-baseline')).toBe(true)
    expect(text?.hasAttribute('alignment-baseline')).toBe(false)
    expect(text?.hasAttribute('dy')).toBe(false)
    expect(Number(text?.getAttribute('y') ?? Number.NaN)).toBe(8.5)
    expect(Number(swatch?.getAttribute('y') ?? Number.NaN)).toBe(3)
  }
})

it('skips outside legend when no host is available and does not fallback to svg', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, { legend: { placement: 'outside' } })
  expect(svg.querySelector('[id="legend-root"]')).toBeNull()
  expect(warnSpy).toHaveBeenCalledWith(
    '[owlplot] outside legend skipped: no host'
  )
  warnSpy.mockRestore()
})

it('outside legend rerender keeps a single external legend root', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const host = createChartHost(svg)
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
          {
            seriesId: 'b',
            label: 'b',
            paint: { type: 'solid', color: '#0000ff' },
            order: 1,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, { legendHost: host })
  renderSvgScene(scene, svg, { legendHost: host })
  expect(host.querySelectorAll('[data-owlplot-legend-root]').length).toBe(1)
})

it('restores host layout styles when leaving side legend mode', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const host = createChartHost(svg)
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, {
    legendHost: host,
    legend: {
      placement: 'outside',
      anchor: 'right-center',
      direction: 'column',
    },
  })
  expect(host.style.display).toBe('flex')

  renderSvgScene(scene, svg, {
    legendHost: host,
    legend: { placement: 'outside', anchor: 'bottom-center' },
  })
  expect(host.style.display).toBe('')
  expect(host.style.alignItems).toBe('')
  expect(host.style.flexDirection).toBe('')
})

it('outside side legend renders as html column in host flex side layout', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '300')
  svg.setAttribute('height', '180')
  const host = createChartHost(svg)
  const scene: SceneNode = {
    kind: SceneNodeKind.GROUP,
    id: 'root',
    children: [],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'Alpha',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
          {
            seriesId: 'b',
            label: 'Beta',
            paint: { type: 'solid', color: '#0000ff' },
            order: 1,
          },
        ],
      },
    },
  }

  renderSvgScene(scene, svg, {
    legendHost: host,
    legend: {
      placement: 'outside',
      anchor: 'right-center',
      direction: 'column',
    },
  })

  const root = host.querySelector(
    '[data-owlplot-legend-root]'
  ) as HTMLDivElement | null
  expect(root).not.toBeNull()
  expect(root?.style.flexDirection).toBe('column')
  expect(host.style.display).toBe('flex')
  expect(host.style.alignItems).toBe('center')
  expect(host.style.flexDirection).toBe('row')
  expect(svg.querySelector('[id="legend-root"]')).toBeNull()
})
