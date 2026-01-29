import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveGlyphFromElement } from './glyphResolver'
import { DATA_X, DATA_Y } from '../../shared/dataAttributes'
import { TOOLTIP_DATUM_SYMBOL } from '../../shared/symbols'
import type { ExtendedSVGElement } from '../../shared/extendedElements'

describe('glyph resolver', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    })
    ;(global as any).document = dom.window.document
    ;(global as any).window = dom.window
  })
  const metadata = {
    scales: { x: (v: number) => v, y: (v: number) => v },
  }

  describe('invariant: a glyph is only hoverable if it carries full domain metadata', () => {
    it('returns none when element is null', () => {
      expect(resolveGlyphFromElement(null, metadata)).toEqual({
        kind: 'none',
      })
    })

    it('returns none when DATA_X is missing', () => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      el.setAttribute(DATA_Y, '1')
      ;(el as ExtendedSVGElement)[TOOLTIP_DATUM_SYMBOL] = {
        seriesId: 's1',
        values: { x: 0, y: 1 },
      }
      expect(resolveGlyphFromElement(el, metadata)).toEqual({ kind: 'none' })
    })

    it('returns none when DATA_Y is missing', () => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      el.setAttribute(DATA_X, '0')
      ;(el as ExtendedSVGElement)[TOOLTIP_DATUM_SYMBOL] = {
        seriesId: 's1',
        values: { x: 0, y: 1 },
      }
      expect(resolveGlyphFromElement(el, metadata)).toEqual({ kind: 'none' })
    })

    it('returns none when tooltipDatum is missing (element has attrs)', () => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      el.setAttribute(DATA_X, '0')
      el.setAttribute(DATA_Y, '1')
      expect(resolveGlyphFromElement(el, metadata)).toEqual({ kind: 'none' })
    })

    it('returns none when DATA_X or DATA_Y are invalid (NaN)', () => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      el.setAttribute(DATA_X, 'not-a-number')
      el.setAttribute(DATA_Y, '1')
      ;(el as ExtendedSVGElement)[TOOLTIP_DATUM_SYMBOL] = {
        seriesId: 's1',
        values: { x: 0, y: 1 },
      }
      expect(resolveGlyphFromElement(el, metadata)).toEqual({ kind: 'none' })
    })

    it('returns points when element has DATA_X, DATA_Y and tooltipDatum', () => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      el.setAttribute(DATA_X, '2.5')
      el.setAttribute(DATA_Y, '3.5')
      ;(el as ExtendedSVGElement)[TOOLTIP_DATUM_SYMBOL] = {
        seriesId: 'mySeries',
        values: { x: 2.5, y: 3.5 },
      }
      const result = resolveGlyphFromElement(el, metadata)
      expect(result.kind).toBe('points')
      if (result.kind === 'points') {
        expect(result.points).toHaveLength(1)
        expect(result.points[0]).toEqual({
          seriesId: 'mySeries',
          point: { x: 2.5, y: 3.5 },
        })
        expect(result.primaryIndex).toBe(0)
      }
    })
  })
})
