import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  detachAllHoverListeners,
  attachGlyphHover,
  attachDataHover,
} from './hoverManager'
import { createHoverResolver } from './resolvers'
import { createIndicators } from './indicators/indicators'
import { buildPointIndexFromRenderedElements } from './pointIndex'
import { DATA_SERIES_ID, DATA_X, DATA_Y } from '../shared/dataAttributes'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  GLYPH_HOVER_LISTENERS_SYMBOL,
  DATA_HOVER_LISTENERS_SYMBOL,
  POINT_INDEX_SYMBOL,
} from '../shared/symbols'
import { HoverModeKind, HoverIndicatorKind } from '../shared/enums'
import { SvgAttributeName } from '../shared/enums'
import type { HoverMetadata } from './types'
import * as svgCoordinates from '../shared/svgCoordinates'
import * as glyphResolver from './resolvers/glyphResolver'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
}

describe('hover manager', () => {
  let svg: SVGSVGElement
  const plotRect = { x: 0, y: 0, width: 200, height: 100 }
  const metadata: HoverMetadata = {
    xInvert: (px: number) => px,
    yInvert: (py: number) => py,
    scales: { x: (v: number) => v, y: (v: number) => v },
    plotRect,
    xDomain: [0, 10],
    yDomain: [0, 10],
    series: [],
  }

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
  })

  describe('detachAllHoverListeners', () => {
    it('clears glyph hover listeners when present', () => {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      circle.setAttribute(DATA_SERIES_ID, 's1')
      circle.setAttribute(DATA_X, '0')
      circle.setAttribute(DATA_Y, '0')
      svg.appendChild(circle)
      const indicators = createIndicators(
        [{ kind: HoverIndicatorKind.NONE }],
        svg
      )
      attachGlyphHover(svg, null, metadata, indicators)
      expect(
        (svg as ExtendedSVGSVGElement)[GLYPH_HOVER_LISTENERS_SYMBOL]
      ).toBeDefined()

      detachAllHoverListeners(svg)
      expect(
        (svg as ExtendedSVGSVGElement)[GLYPH_HOVER_LISTENERS_SYMBOL]
      ).toBeUndefined()
    })

    it('clears data hover listeners when present', () => {
      const resolver = createHoverResolver(
        { kind: HoverModeKind.POINT },
        metadata
      )
      const indicators = createIndicators(
        [{ kind: HoverIndicatorKind.NONE }],
        svg
      )
      attachDataHover(svg, resolver, indicators, null, metadata)
      expect(
        (svg as ExtendedSVGSVGElement)[DATA_HOVER_LISTENERS_SYMBOL]
      ).toBeDefined()

      detachAllHoverListeners(svg)
      expect(
        (svg as ExtendedSVGSVGElement)[DATA_HOVER_LISTENERS_SYMBOL]
      ).toBeUndefined()
    })

    it('does not throw when no listeners were attached', () => {
      expect(() => detachAllHoverListeners(svg)).not.toThrow()
    })

    it('after detach and re-attach glyph hover, symbol holds new refs only', () => {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      circle.setAttribute(DATA_SERIES_ID, 's1')
      circle.setAttribute(DATA_X, '0')
      circle.setAttribute(DATA_Y, '0')
      svg.appendChild(circle)
      const indicators = createIndicators(
        [{ kind: HoverIndicatorKind.NONE }],
        svg
      )
      attachGlyphHover(svg, null, metadata, indicators)
      const firstRefs = (svg as ExtendedSVGSVGElement)[
        GLYPH_HOVER_LISTENERS_SYMBOL
      ]
      detachAllHoverListeners(svg)
      attachGlyphHover(svg, null, metadata, indicators)
      const secondRefs = (svg as ExtendedSVGSVGElement)[
        GLYPH_HOVER_LISTENERS_SYMBOL
      ]
      expect(secondRefs).toBeDefined()
      expect(secondRefs).not.toBe(firstRefs)
    })
  })

  describe('attachGlyphHover (spatial hit)', () => {
    it('returns false when point index is empty (no glyphs)', () => {
      const indicators = createIndicators(
        [{ kind: HoverIndicatorKind.NONE }],
        svg
      )
      const result = attachGlyphHover(svg, null, metadata, indicators)
      expect(result).toBe(false)
    })

    it('resolves glyph by spatial hit when pointer coords fall inside circle', () => {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      ) as SVGCircleElement
      circle.setAttribute(SvgAttributeName.CX, '50')
      circle.setAttribute(SvgAttributeName.CY, '25')
      circle.setAttribute(SvgAttributeName.R, '5')
      circle.setAttribute(DATA_SERIES_ID, 's1')
      circle.setAttribute(DATA_X, '0')
      circle.setAttribute(DATA_Y, '1')
      svg.appendChild(circle)

      const pointIndex = buildPointIndexFromRenderedElements(svg)
      const extendedSvg = svg as ExtendedSVGSVGElement
      extendedSvg[POINT_INDEX_SYMBOL] = pointIndex

      vi.spyOn(svgCoordinates, 'getMouseSvgCoordinates').mockReturnValue({
        x: 50,
        y: 25,
      })

      const resolveSpy = vi.spyOn(glyphResolver, 'resolveGlyphFromElement')

      const indicators = createIndicators(
        [{ kind: HoverIndicatorKind.NONE }],
        svg
      )
      attachGlyphHover(svg, null, metadata, indicators)

      const win = testGlobal.window
      const event = new win.MouseEvent('pointermove', {
        clientX: 50,
        clientY: 25,
        bubbles: true,
      })
      svg.dispatchEvent(event)

      expect(resolveSpy).toHaveBeenCalledWith(circle, metadata)
      resolveSpy.mockRestore()
      vi.restoreAllMocks()
    })
  })
})
