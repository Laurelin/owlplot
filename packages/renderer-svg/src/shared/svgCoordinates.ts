/**
 * Get mouse coordinates in SVG coordinate space, handling viewBox/transforms correctly.
 * Returns null if transformation fails (treat as 'none' result).
 */
export function getMouseSvgCoordinates(
  svg: SVGSVGElement,
  event: PointerEvent
): { x: number; y: number } | null {
  // Prefer DOMPoint if available (newer API)
  const point =
    typeof DOMPoint !== 'undefined'
      ? new DOMPoint(event.clientX, event.clientY)
      : svg.createSVGPoint()

  if (typeof DOMPoint === 'undefined') {
    point.x = event.clientX
    point.y = event.clientY
  }

  const matrix = svg.getScreenCTM()
  if (!matrix) return null // Return null instead of {0,0} to avoid bizarre jumps

  const transformed = point.matrixTransform(matrix.inverse())
  return { x: transformed.x, y: transformed.y }
}
