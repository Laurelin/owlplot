export function calculateTooltipPosition(
  event: MouseEvent,
  tooltipEl: HTMLElement
): { x: number; y: number } {
  const offset = 8
  const margin = 8
  const tooltipWidth = tooltipEl.offsetWidth
  const tooltipHeight = tooltipEl.offsetHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Center tooltip horizontally on cursor/x-line (event.pageX is the anchor). Clamp against viewport only.
  let x = event.pageX - tooltipWidth / 2
  let y = event.pageY - tooltipHeight - offset

  const viewportLeft = window.scrollX
  const viewportRight = window.scrollX + viewportWidth
  if (x + tooltipWidth > viewportRight - margin) {
    x = viewportRight - tooltipWidth - margin
  }
  if (x < viewportLeft + margin) {
    x = viewportLeft + margin
  }

  // Flip to below if too close to top of visible viewport
  const viewportTop = window.scrollY
  if (y < viewportTop + margin) {
    y = event.pageY + offset
  }

  // Ensure minimum margin from bottom edge (check against visible viewport)
  const viewportBottom = window.scrollY + viewportHeight
  if (y + tooltipHeight > viewportBottom - margin) {
    y = viewportBottom - tooltipHeight - margin
  }

  return { x, y }
}
