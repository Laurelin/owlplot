import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  emphasizePoints,
  drawPointEmphasisOverlay,
  restorePointEmphasis,
  type PointEmphasisContext,
  type PointEmphasisOverlayContext,
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
        2 // scale factor
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
        2 // scale factor
      )
      expect(result).toBeNull()
    })

    it('returns dom result with no points when nearestPoints is empty', () => {
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
      const result = emphasizePoints([], context, svg, 2)
      expect(result).not.toBeNull()
      expect((result as PointEmphasisResult).mode).toBe('dom')
      expect((result as PointEmphasisResult).emphasizedPoints).toHaveLength(0)
    })

    it('applies transform-based emphasis when pointIndex has matching glyph; restore reverts transform', () => {
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
        2 // scale factor
      )
      expect(result).not.toBeNull()
      expect((result as PointEmphasisResult).mode).toBe('dom')
      expect((result as PointEmphasisResult).emphasizedPoints).toHaveLength(1)
      expect(circle.getAttribute(SvgAttributeName.TRANSFORM)).toContain('scale(2)')

      restorePointEmphasis(result as PointEmphasisResult)
      expect(circle.getAttribute(SvgAttributeName.TRANSFORM)).toBeNull()
    })

    it('when glyphs exist, does not create overlay nodes (no data-owlplot-hover-layer)', () => {
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
        2
      )
      expect(svg.querySelector('[data-owlplot-hover-layer]')).toBeNull()
    })
  })

  describe('overlay when no glyphs', () => {
    it('drawPointEmphasisOverlay returns overlay result; restore removes overlay', () => {
      const overlayContext: PointEmphasisOverlayContext = {
        scales: { x: identity, y: identity },
        svg,
      }
      const result = drawPointEmphasisOverlay(
        [
          { seriesId: 's1', point: { x: 10, y: 20 } },
          { seriesId: 's2', point: { x: 30, y: 40 } },
        ],
        overlayContext,
        5
      )
      expect(result.mode).toBe('overlay')
      expect(svg.querySelector('[data-owlplot-hover-layer]')).not.toBeNull()
      restorePointEmphasis(result)
      expect(svg.querySelector('[data-owlplot-hover-layer]')).toBeNull()
    })

    it('overlay uses series color by default when seriesStyles provided', () => {
      const seriesStyles = new Map([['s1', { stroke: '#0ea5e9' }]])
      const overlayContext: PointEmphasisOverlayContext = {
        scales: { x: identity, y: identity },
        svg,
        seriesStyles,
      }
      drawPointEmphasisOverlay(
        [{ seriesId: 's1', point: { x: 10, y: 20 } }],
        overlayContext,
        5
      )
      const layer = svg.querySelector('[data-owlplot-hover-layer]')
      expect(layer).not.toBeNull()
      const circle = layer!.querySelector('circle')
      expect(circle).not.toBeNull()
      expect(circle!.getAttribute('fill')).toBe('#0ea5e9')
    })

    it('user style override wins over series-derived fill', () => {
      const seriesStyles = new Map([['s1', { stroke: '#0ea5e9' }]])
      const overlayContext: PointEmphasisOverlayContext = {
        scales: { x: identity, y: identity },
        svg,
        seriesStyles,
        emphasisOptions: { style: { fill: '#7c3aed', opacity: 0.8 } },
      }
      drawPointEmphasisOverlay(
        [{ seriesId: 's1', point: { x: 10, y: 20 } }],
        overlayContext,
        5
      )
      const layer = svg.querySelector('[data-owlplot-hover-layer]')
      const circle = layer!.querySelector('circle')
      expect(circle!.getAttribute('fill')).toBe('#7c3aed')
      expect(circle!.getAttribute('opacity')).toBe('0.8')
    })
  })
})
