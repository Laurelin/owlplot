import { ExtendedSVGSVGElement } from '../../shared/extendedElements'
import { HOVER_LINE_SYMBOL } from '../../shared/symbols'
import { SvgAttributeName } from '../../shared/enums'
import { SVG_NS } from '../../render/svgDom'

function getOrCreateHoverYLine(svg: SVGSVGElement): SVGLineElement {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const existing = extendedSvg[HOVER_LINE_SYMBOL]
  if (existing && svg.contains(existing)) return existing

  const line = document.createElementNS(SVG_NS, 'line')
  line.style.stroke = '#999'
  line.style.strokeWidth = '1'
  line.style.strokeDasharray = '4,4'
  line.style.pointerEvents = 'none'
  line.style.display = 'none'
  svg.appendChild(line)

  extendedSvg[HOVER_LINE_SYMBOL] = line
  return line
}

export function hideYLine(svg: SVGSVGElement) {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const line = extendedSvg[HOVER_LINE_SYMBOL]
  if (line) line.style.display = 'none'
}

export function updateYLine(
  svg: SVGSVGElement,
  svgY: number,
  plotRect: { x: number; y: number; width: number; height: number },
  style?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string }
) {
  const line = getOrCreateHoverYLine(svg)

  if (style) {
    if (style.stroke) line.style.stroke = style.stroke
    if (style.strokeWidth) line.style.strokeWidth = String(style.strokeWidth)
    if (style.strokeDasharray)
      line.style.strokeDasharray = style.strokeDasharray
  }

  const clampedY = Math.max(
    plotRect.y,
    Math.min(plotRect.y + plotRect.height, svgY)
  )

  line.setAttribute(SvgAttributeName.X1, String(plotRect.x))
  line.setAttribute(SvgAttributeName.Y1, String(clampedY))
  line.setAttribute(SvgAttributeName.X2, String(plotRect.x + plotRect.width))
  line.setAttribute(SvgAttributeName.Y2, String(clampedY))
  line.style.display = 'block'
}
