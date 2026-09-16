import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { TooltipKind, type TooltipDatum } from '@owlplot/core'
import type { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  SERIES_STYLES_SYMBOL,
  TOOLTIP_CONTAINER_SYMBOL,
  TOOLTIP_CONTEXT_SYMBOL,
} from '../shared/symbols'
import { hideTooltip, showTooltip, showTooltipFromResult } from './tooltipDom'

const testGlobal = globalThis as unknown as {
  document: Document
  window: Window & typeof globalThis
}

describe('tooltip DOM effects', () => {
  let svg: ExtendedSVGSVGElement

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><body></body>', {
      pretendToBeVisual: true,
    })
    testGlobal.document = dom.window.document
    testGlobal.window = dom.window
    svg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    ) as ExtendedSVGSVGElement
  })

  it('adapts point results, passes options, reuses the container, and destroys', () => {
    svg[TOOLTIP_CONTEXT_SYMBOL] = { locale: 'en-US' }
    svg[SERIES_STYLES_SYMBOL] = new Map([['s1', { stroke: 'red' }]])
    const destroy = vi.fn()
    const render = vi.fn(() => document.createElement('div'))
    const renderer = { render, destroy }
    const event = new window.MouseEvent('mousemove', {
      clientX: 10,
      clientY: 20,
    }) as PointerEvent
    const result = {
      kind: 'points' as const,
      points: [{ seriesId: 's1', point: { x: 2, y: 3 } }],
      primaryIndex: 0,
    }

    showTooltipFromResult(result, event, svg, renderer)
    const firstContainer = svg[TOOLTIP_CONTAINER_SYMBOL]
    showTooltipFromResult(result, event, svg, renderer)

    expect(svg[TOOLTIP_CONTAINER_SYMBOL]).toBe(firstContainer)
    expect(render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: TooltipKind.POINT,
        x: 2,
        values: { s1: 3, x: 2 },
      }),
      expect.objectContaining({
        context: { locale: 'en-US' },
      })
    )
    expect(destroy).toHaveBeenCalledTimes(1)
    hideTooltip(svg)
    expect(destroy).toHaveBeenCalledTimes(2)
  })

  it('hides for none or an invalid primary index', () => {
    const renderer = { render: vi.fn(() => document.createElement('div')) }
    const event = new window.MouseEvent('mousemove') as PointerEvent
    showTooltipFromResult({ kind: 'none' }, event, svg, renderer)
    showTooltipFromResult(
      {
        kind: 'points',
        points: [{ seriesId: 's1', point: { x: 1, y: 2 } }],
        primaryIndex: 4,
      },
      event,
      svg,
      renderer
    )
    expect(renderer.render).not.toHaveBeenCalled()
  })

  it('does not render tooltip data without canonical points', () => {
    const renderer = { render: vi.fn(() => document.createElement('div')) }
    const datum = {
      kind: TooltipKind.POINT,
      values: {},
      points: [],
      x: 1,
    } as TooltipDatum
    showTooltip(datum, new window.MouseEvent('mousemove'), svg, renderer)
    expect(renderer.render).not.toHaveBeenCalled()
  })
})
