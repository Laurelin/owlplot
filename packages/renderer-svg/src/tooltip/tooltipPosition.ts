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

  // Use pageX/pageY to account for scroll offset since tooltip is positioned absolutely on document.body
  let x = event.pageX + offset
  let y = event.pageY - tooltipHeight - offset

  // Flip to below if too close to top of visible viewport
  const viewportTop = window.scrollY
  if (y < viewportTop + margin) {
    y = event.pageY + offset
  }

  // Flip to left if too close to right edge (check against viewport since we want it visible)
  const viewportRight = window.scrollX + viewportWidth
  if (x + tooltipWidth > viewportRight - margin) {
    x = event.pageX - tooltipWidth - offset
  }

  // Ensure minimum margin from left edge
  const viewportLeft = window.scrollX
  if (x < viewportLeft + margin) {
    x = viewportLeft + margin
  }

  // Ensure minimum margin from bottom edge (check against visible viewport)
  const viewportBottom = window.scrollY + viewportHeight
  if (y + tooltipHeight > viewportBottom - margin) {
    y = viewportBottom - tooltipHeight - margin
  }

  return { x, y }
}
