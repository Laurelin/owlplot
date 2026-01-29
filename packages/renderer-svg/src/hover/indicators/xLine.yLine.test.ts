import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import { updateXLine, hideXLine } from './xLine'
import { updateYLine, hideYLine } from './yLine'
import { SvgAttributeName } from '../../shared/enums'
import { X_HOVER_LINE_SYMBOL, Y_HOVER_LINE_SYMBOL } from '../../shared/symbols'
import type { ExtendedSVGSVGElement } from '../../shared/extendedElements'

describe('xLine and yLine', () => {
  let svg: SVGSVGElement
  const plotRect = { x: 10, y: 20, width: 180, height: 60 }

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

  describe('invariant: X and Y line indicators use separate DOM slots', () => {
    it('updateXLine creates vertical line (x1 === x2)', () => {
      updateXLine(svg, 50, plotRect)
      const lines = svg.querySelectorAll('line')
      expect(lines.length).toBe(1)
      const line = lines[0]!
      expect(line.getAttribute(SvgAttributeName.X1)).toBe('50')
      expect(line.getAttribute(SvgAttributeName.X2)).toBe('50')
      expect(line.getAttribute(SvgAttributeName.Y1)).toBe(String(plotRect.y))
      expect(line.getAttribute(SvgAttributeName.Y2)).toBe(
        String(plotRect.y + plotRect.height)
      )
    })

    it('updateYLine creates horizontal line (y1 === y2)', () => {
      updateYLine(svg, 40, plotRect)
      const lines = svg.querySelectorAll('line')
      expect(lines.length).toBe(1)
      const line = lines[0]!
      expect(line.getAttribute(SvgAttributeName.Y1)).toBe('40')
      expect(line.getAttribute(SvgAttributeName.Y2)).toBe('40')
      expect(line.getAttribute(SvgAttributeName.X1)).toBe(String(plotRect.x))
      expect(line.getAttribute(SvgAttributeName.X2)).toBe(
        String(plotRect.x + plotRect.width)
      )
    })

    it('X and Y lines are independent: both visible on same SVG', () => {
      updateXLine(svg, 80, plotRect)
      updateYLine(svg, 45, plotRect)
      const lines = svg.querySelectorAll('line')
      expect(lines.length).toBe(2)
      const extendedSvg = svg as ExtendedSVGSVGElement
      const xLine = extendedSvg[X_HOVER_LINE_SYMBOL]
      const yLine = extendedSvg[Y_HOVER_LINE_SYMBOL]
      expect(xLine).toBeDefined()
      expect(yLine).toBeDefined()
      expect(xLine).not.toBe(yLine)
      expect(xLine!.getAttribute(SvgAttributeName.X1)).toBe(
        xLine!.getAttribute(SvgAttributeName.X2)
      )
      expect(yLine!.getAttribute(SvgAttributeName.Y1)).toBe(
        yLine!.getAttribute(SvgAttributeName.Y2)
      )
    })

    it('hideXLine does not hide Y line', () => {
      updateXLine(svg, 50, plotRect)
      updateYLine(svg, 40, plotRect)
      hideXLine(svg)
      const extendedSvg = svg as ExtendedSVGSVGElement
      expect(extendedSvg[X_HOVER_LINE_SYMBOL]!.style.display).toBe('none')
      expect(extendedSvg[Y_HOVER_LINE_SYMBOL]!.style.display).toBe('block')
    })

    it('hideYLine does not hide X line', () => {
      updateXLine(svg, 50, plotRect)
      updateYLine(svg, 40, plotRect)
      hideYLine(svg)
      const extendedSvg = svg as ExtendedSVGSVGElement
      expect(extendedSvg[Y_HOVER_LINE_SYMBOL]!.style.display).toBe('none')
      expect(extendedSvg[X_HOVER_LINE_SYMBOL]!.style.display).toBe('block')
    })
  })
})
