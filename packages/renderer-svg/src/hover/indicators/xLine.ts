import { ExtendedSVGSVGElement } from '../../shared/extendedElements'
import { X_HOVER_LINE_SYMBOL } from '../../shared/symbols'
import { SvgAttributeName } from '../../shared/enums'
import { SVG_NS } from '../../render/svgDom'

function getOrCreateXHoverLine(svg: SVGSVGElement): SVGLineElement {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const existing = extendedSvg[X_HOVER_LINE_SYMBOL]
  if (existing && svg.contains(existing)) return existing

  const line = document.createElementNS(SVG_NS, 'line')
  line.style.stroke = '#999'
  line.style.strokeWidth = '1'
  line.style.strokeDasharray = '4,4'
  line.style.pointerEvents = 'none'
  line.style.display = 'none'
  svg.appendChild(line)

  extendedSvg[X_HOVER_LINE_SYMBOL] = line
  return line
}

export function hideXLine(svg: SVGSVGElement) {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const line = extendedSvg[X_HOVER_LINE_SYMBOL]
  if (line) line.style.display = 'none'
}

type LineStyle = {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
}

function applyStroke(line: SVGLineElement, style: LineStyle | undefined): void {
  if (style?.stroke) line.style.stroke = style.stroke
}

function applyStrokeWidth(
  line: SVGLineElement,
  style: LineStyle | undefined
): void {
  if (style?.strokeWidth) line.style.strokeWidth = String(style.strokeWidth)
}

function applyStrokeDasharray(
  line: SVGLineElement,
  style: LineStyle | undefined
): void {
  if (style?.strokeDasharray) {
    line.style.strokeDasharray = style.strokeDasharray
  }
}

function applyLineStyle(line: SVGLineElement, style?: LineStyle): void {
  applyStroke(line, style)
  applyStrokeWidth(line, style)
  applyStrokeDasharray(line, style)
}

export function updateXLine(
  svg: SVGSVGElement,
  svgX: number,
  plotRect: { x: number; y: number; width: number; height: number },
  style?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string }
) {
  const line = getOrCreateXHoverLine(svg)
  applyLineStyle(line, style)

  const clampedX = Math.max(
    plotRect.x,
    Math.min(plotRect.x + plotRect.width, svgX)
  )

  line.setAttribute(SvgAttributeName.X1, String(clampedX))
  line.setAttribute(SvgAttributeName.Y1, String(plotRect.y))
  line.setAttribute(SvgAttributeName.X2, String(clampedX))
  line.setAttribute(SvgAttributeName.Y2, String(plotRect.y + plotRect.height))
  line.style.display = 'block'
}
