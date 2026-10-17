import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SceneNodeKind, TooltipKind, createSceneTooltip } from '@owlplot/core'
import type { SceneNode } from '@owlplot/core'
import { renderSvgScene, disposeSvgScene } from './renderSvgScene'
import { showTooltipFromResult } from '../tooltip/tooltipDom'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  DATA_HOVER_LISTENERS_SYMBOL,
  POINT_INDEX_SYMBOL,
  SERIES_STYLES_SYMBOL,
  TOOLTIP_CONTAINER_SYMBOL,
} from '../shared/symbols'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
}

function scaleDescriptor() {
  return {
    type: 'linear' as const,
    domain: [0, 10] as [number, number],
    range: [0, 200] as [number, number],
  }
}

function sceneWithHover(): SceneNode {
  const scale = scaleDescriptor()
  return {
    id: 'root',
    kind: SceneNodeKind.GROUP,
    children: [
      {
        id: 'point:s1:0',
        kind: SceneNodeKind.POINT,
        seriesId: 's1',
        datumIndex: 0,
        x: 5,
        y: 5,
        point: { shape: { kind: 'circle' }, size: 4 },
        style: { fill: { type: 'solid', color: '#000' } },
        metadata: {
          tooltip: createSceneTooltip(TooltipKind.POINT, [
            { seriesId: 's1', x: 5, y: 5 },
          ]),
        },
      },
    ],
    metadata: {
      hover: {
        scales: { x: scale, y: scale },
        plotRect: { x: 0, y: 0, width: 200, height: 100 },
        xDomain: [0, 10] as [number, number],
        yDomain: [0, 10] as [number, number],
        series: [
          { id: 's1', yAxis: 'left' as const, sortedPoints: [{ x: 5, y: 5 }] },
        ],
      },
    },
  }
}

function sceneWithoutHover(): SceneNode {
  return {
    id: 'root',
    kind: SceneNodeKind.GROUP,
    children: [
      {
        id: 'mark',
        kind: SceneNodeKind.RECT,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
    ],
  }
}

function hoverListenerCalls(
  spy: ReturnType<typeof vi.spyOn>,
  types: string[]
): number {
  return spy.mock.calls.filter(call => types.includes(call[0] as string)).length
}

describe('disposeSvgScene', () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    })
    testGlobal.document = dom.window.document
    testGlobal.window = dom.window
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '200')
    svg.setAttribute('height', '100')
    document.body.appendChild(svg)
  })

  it('removes hover listeners, the tooltip container, children, and session state', () => {
    const host = document.createElement('div')
    const sibling = document.createElement('p')
    host.append(sibling, svg)

    const addSpy = vi.spyOn(svg, 'addEventListener')
    renderSvgScene(sceneWithHover(), svg, { tooltip: null })
    const extended = svg as ExtendedSVGSVGElement
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeDefined()
    expect(svg.childNodes.length).toBeGreaterThan(0)
    const added = hoverListenerCalls(addSpy, ['pointermove', 'pointerleave'])
    expect(added).toBeGreaterThan(0)

    const renderer = { render: vi.fn(() => document.createElement('div')) }
    const event = new window.MouseEvent('mousemove') as PointerEvent
    showTooltipFromResult(
      {
        kind: 'points',
        points: [{ seriesId: 's1', point: { x: 5, y: 5 } }],
        primaryIndex: 0,
      },
      event,
      svg,
      renderer
    )
    const container = extended[TOOLTIP_CONTAINER_SYMBOL]
    expect(container).toBeDefined()
    expect(document.body.contains(container as Node)).toBe(true)
    const bodyChildrenBefore = document.body.childElementCount

    const removeSpy = vi.spyOn(svg, 'removeEventListener')
    disposeSvgScene(svg)

    expect(hoverListenerCalls(removeSpy, ['pointermove', 'pointerleave'])).toBe(
      added
    )
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeUndefined()
    expect(extended[TOOLTIP_CONTAINER_SYMBOL]).toBeUndefined()
    expect(extended[POINT_INDEX_SYMBOL]).toBeUndefined()
    expect(extended[SERIES_STYLES_SYMBOL]).toBeUndefined()
    expect(document.body.contains(container as Node)).toBe(false)
    expect(document.body.childElementCount).toBe(bodyChildrenBefore - 1)
    expect(svg.childNodes.length).toBe(0)
    // Host-owned DOM stays.
    expect(host.contains(svg)).toBe(true)
    expect(host.contains(sibling)).toBe(true)
  })

  it('detaches prior listeners on a hover-to-no-hover re-render', () => {
    renderSvgScene(sceneWithHover(), svg, { tooltip: null })
    const extended = svg as ExtendedSVGSVGElement
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeDefined()

    renderSvgScene(sceneWithoutHover(), svg, { tooltip: null })
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeUndefined()
  })

  it('is idempotent and safe on a fresh element', () => {
    renderSvgScene(sceneWithHover(), svg, { tooltip: null })
    disposeSvgScene(svg)
    expect(() => disposeSvgScene(svg)).not.toThrow()
    expect(svg.childNodes.length).toBe(0)

    const fresh = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    ) as SVGSVGElement
    expect(() => disposeSvgScene(fresh)).not.toThrow()
  })

  it('renders and serializes with no process global', () => {
    const runtime = globalThis as { process?: unknown }
    const saved = runtime.process
    delete runtime.process
    try {
      expect(() =>
        renderSvgScene(sceneWithHover(), svg, { tooltip: null })
      ).not.toThrow()
      expect(svg.childNodes.length).toBeGreaterThan(0)
      expect(() => disposeSvgScene(svg)).not.toThrow()
    } finally {
      runtime.process = saved
    }
  })
})
