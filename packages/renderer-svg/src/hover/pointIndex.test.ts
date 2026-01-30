import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildPointIndexFromRenderedElements,
  findGlyphAtPoint,
} from './pointIndex'
import { DATA_SERIES_ID, DATA_X, DATA_Y } from '../shared/dataAttributes'
import { SvgAttributeName } from '../shared/enums'

describe('point index', () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    })
    ;(global as any).document = dom.window.document
    ;(global as any).window = dom.window
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '200')
    svg.setAttribute('height', '100')
  })

  it('returns empty Map when SVG has no point glyphs', () => {
    const index = buildPointIndexFromRenderedElements(svg)
    expect(index.size).toBe(0)
  })

  it('skips elements without data attrs', () => {
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    ) as SVGCircleElement
    circle.setAttribute(SvgAttributeName.CX, '10')
    circle.setAttribute(SvgAttributeName.CY, '20')
    circle.setAttribute(SvgAttributeName.R, '2')
    svg.appendChild(circle)
    const index = buildPointIndexFromRenderedElements(svg)
    expect(index.size).toBe(0)
  })

  it('indexes circles with DATA_SERIES_ID, DATA_X, DATA_Y', () => {
    const c1 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    ) as SVGCircleElement
    c1.setAttribute(DATA_SERIES_ID, 's1')
    c1.setAttribute(DATA_X, '0')
    c1.setAttribute(DATA_Y, '1')
    c1.setAttribute(SvgAttributeName.R, '2.5')
    svg.appendChild(c1)
    const c2 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    ) as SVGCircleElement
    c2.setAttribute(DATA_SERIES_ID, 's1')
    c2.setAttribute(DATA_X, '2')
    c2.setAttribute(DATA_Y, '3')
    c2.setAttribute(SvgAttributeName.R, '3')
    svg.appendChild(c2)

    const index = buildPointIndexFromRenderedElements(svg)
    expect(index.size).toBe(1)
    const refs = index.get('s1')
    expect(refs).toHaveLength(2)
    expect(refs!.map(r => r.x)).toEqual([0, 2])
    expect(refs!.map(r => r.y)).toEqual([1, 3])
  })

  it('sorts refs by x within each series', () => {
    const c1 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    ) as SVGCircleElement
    c1.setAttribute(DATA_SERIES_ID, 's1')
    c1.setAttribute(DATA_X, '3')
    c1.setAttribute(DATA_Y, '0')
    c1.setAttribute(SvgAttributeName.R, '2')
    svg.appendChild(c1)
    const c2 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    ) as SVGCircleElement
    c2.setAttribute(DATA_SERIES_ID, 's1')
    c2.setAttribute(DATA_X, '1')
    c2.setAttribute(DATA_Y, '0')
    c2.setAttribute(SvgAttributeName.R, '2')
    svg.appendChild(c2)

    const index = buildPointIndexFromRenderedElements(svg)
    const refs = index.get('s1')!
    expect(refs.map(r => r.x)).toEqual([1, 3])
  })

  it('skips circles with missing or invalid seriesId / x / y', () => {
    const bad1 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    ) as SVGCircleElement
    bad1.setAttribute(DATA_SERIES_ID, '')
    bad1.setAttribute(DATA_X, '0')
    bad1.setAttribute(DATA_Y, '0')
    bad1.setAttribute(SvgAttributeName.R, '2')
    svg.appendChild(bad1)
    const bad2 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    ) as SVGCircleElement
    bad2.setAttribute(DATA_SERIES_ID, 's1')
    bad2.setAttribute(DATA_X, 'x')
    bad2.setAttribute(DATA_Y, '0')
    bad2.setAttribute(SvgAttributeName.R, '2')
    svg.appendChild(bad2)

    const index = buildPointIndexFromRenderedElements(svg)
    expect(index.size).toBe(0)
  })

  describe('findGlyphAtPoint', () => {
    function makeCircle(
      cx: number,
      cy: number,
      r: number,
      seriesId: string,
      domainX: number,
      domainY: number
    ): SVGCircleElement {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      ) as SVGCircleElement
      circle.setAttribute(SvgAttributeName.CX, String(cx))
      circle.setAttribute(SvgAttributeName.CY, String(cy))
      circle.setAttribute(SvgAttributeName.R, String(r))
      circle.setAttribute(DATA_SERIES_ID, seriesId)
      circle.setAttribute(DATA_X, String(domainX))
      circle.setAttribute(DATA_Y, String(domainY))
      return circle
    }

    it('returns null when point index is empty', () => {
      const index = new Map()
      expect(findGlyphAtPoint(index, 10, 10)).toBeNull()
    })

    it('returns null when (x,y) is not inside any circle or hit slop', () => {
      const c = makeCircle(10, 20, 2.5, 's1', 0, 1)
      svg.appendChild(c)
      const index = buildPointIndexFromRenderedElements(svg)
      expect(findGlyphAtPoint(index, 100, 100)).toBeNull()
    })

    it('returns the ref for the circle containing (x,y)', () => {
      const c = makeCircle(10, 20, 2.5, 's1', 0, 1)
      svg.appendChild(c)
      const index = buildPointIndexFromRenderedElements(svg)
      const hit = findGlyphAtPoint(index, 10, 20)
      expect(hit).not.toBeNull()
      expect(hit!.element).toBe(c)
      expect(hit!.seriesId).toBe('s1')
    })

    it('when two circles overlap, returns the one whose center is closest', () => {
      const c1 = makeCircle(0, 0, 10, 's1', 0, 0)
      const c2 = makeCircle(20, 0, 10, 's1', 1, 0)
      svg.appendChild(c1)
      svg.appendChild(c2)
      const index = buildPointIndexFromRenderedElements(svg)
      const hit = findGlyphAtPoint(index, 5, 0)
      expect(hit).not.toBeNull()
      expect(hit!.element).toBe(c1)
    })

    it('hit slop: point just outside r but within r+slop hits', () => {
      const c = makeCircle(10, 10, 2.5, 's1', 0, 0)
      svg.appendChild(c)
      const index = buildPointIndexFromRenderedElements(svg)
      const hit = findGlyphAtPoint(index, 10, 13)
      expect(hit).not.toBeNull()
      expect(hit!.element).toBe(c)
    })
  })
})
