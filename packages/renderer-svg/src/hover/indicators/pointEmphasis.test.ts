import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  emphasizePoints,
  restorePointEmphasis,
  type PointEmphasisContext,
  type PointEmphasisResult,
} from './pointEmphasis'
import { buildPointIndexFromRenderedElements } from '../pointIndex'
import { DATA_SERIES_ID, DATA_X, DATA_Y } from '../../shared/dataAttributes'
import { SvgAttributeName } from '../../shared/enums'

describe('point emphasis', () => {
  let svg: SVGSVGElement
  const identity = (v: number) => v

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

  describe('invariant: point emphasis only operates on real rendered glyphs', () => {
    it('returns null when pointIndex is empty (size === 0)', () => {
      const context: PointEmphasisContext = {
        scales: { x: identity, y: identity },
        pointIndex: new Map(),
      }
      const result = emphasizePoints(
        [{ seriesId: 's1', point: { x: 0, y: 0 } }],
        context,
        svg,
        5
      )
      expect(result).toBeNull()
    })

    it('returns null when pointIndex has no matching series', () => {
      const index = new Map()
      index.set('otherSeries', [])
      const context: PointEmphasisContext = {
        scales: { x: identity, y: identity },
        pointIndex: index,
      }
      const result = emphasizePoints(
        [{ seriesId: 's1', point: { x: 0, y: 0 } }],
        context,
        svg,
        5
      )
      expect(result).toBeNull()
    })

    it('returns dom result with no circles when nearestPoints is empty', () => {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      ) as SVGCircleElement
      circle.setAttribute(DATA_SERIES_ID, 's1')
      circle.setAttribute(DATA_X, '0')
      circle.setAttribute(DATA_Y, '0')
      circle.setAttribute(SvgAttributeName.R, '2.5')
      svg.appendChild(circle)
      const pointIndex = buildPointIndexFromRenderedElements(svg)
      const context: PointEmphasisContext = {
        scales: { x: identity, y: identity },
        pointIndex,
      }
      const result = emphasizePoints([], context, svg, 5)
      expect(result).not.toBeNull()
      expect((result as PointEmphasisResult).mode).toBe('dom')
      expect((result as PointEmphasisResult).emphasizedCircles).toHaveLength(0)
    })

    it('mutates real circle DOM when pointIndex has matching glyph; restore reverts r', () => {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      ) as SVGCircleElement
      circle.setAttribute(DATA_SERIES_ID, 's1')
      circle.setAttribute(DATA_X, '1')
      circle.setAttribute(DATA_Y, '2')
      circle.setAttribute(SvgAttributeName.R, '2.5')
      svg.appendChild(circle)

      const pointIndex = buildPointIndexFromRenderedElements(svg)
      expect(pointIndex.size).toBe(1)
      const context: PointEmphasisContext = {
        scales: { x: identity, y: identity },
        pointIndex,
      }

      const result = emphasizePoints(
        [{ seriesId: 's1', point: { x: 1, y: 2 } }],
        context,
        svg,
        8
      )
      expect(result).not.toBeNull()
      expect((result as PointEmphasisResult).mode).toBe('dom')
      expect((result as PointEmphasisResult).emphasizedCircles).toHaveLength(1)
      expect(circle.getAttribute(SvgAttributeName.R)).toBe('8')

      restorePointEmphasis(result as PointEmphasisResult)
      expect(circle.getAttribute(SvgAttributeName.R)).toBe('2.5')
    })

    it('does not create overlay nodes (no data-owlplot-hover-layer)', () => {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      ) as SVGCircleElement
      circle.setAttribute(DATA_SERIES_ID, 's1')
      circle.setAttribute(DATA_X, '0')
      circle.setAttribute(DATA_Y, '0')
      circle.setAttribute(SvgAttributeName.R, '2')
      svg.appendChild(circle)
      const pointIndex = buildPointIndexFromRenderedElements(svg)
      const context: PointEmphasisContext = {
        scales: { x: identity, y: identity },
        pointIndex,
      }
      emphasizePoints(
        [{ seriesId: 's1', point: { x: 0, y: 0 } }],
        context,
        svg,
        5
      )
      expect(svg.querySelector('[data-owlplot-hover-layer]')).toBeNull()
    })
  })
})
