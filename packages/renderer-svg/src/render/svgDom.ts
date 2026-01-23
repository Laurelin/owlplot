export const SVG_NS = 'http://www.w3.org/2000/svg'

export function createSvgElement(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag)
}

export function clearSvg(svg: SVGSVGElement) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
}
