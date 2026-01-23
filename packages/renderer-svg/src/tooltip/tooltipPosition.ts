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

  let x = event.clientX + offset
  let y = event.clientY - tooltipHeight - offset

  // Flip to below if too close to top
  if (y < margin) {
    y = event.clientX + offset
  }

  // Flip to left if too close to right edge
  if (x + tooltipWidth > viewportWidth - margin) {
    x = event.clientX - tooltipWidth - offset
  }

  // Ensure minimum margin from left edge
  if (x < margin) {
    x = margin
  }

  // Ensure minimum margin from bottom edge
  if (y + tooltipHeight > viewportHeight - margin) {
    y = viewportHeight - tooltipHeight - margin
  }

  return { x, y }
}
