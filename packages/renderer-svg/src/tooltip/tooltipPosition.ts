const TOOLTIP_OFFSET = 8
const VIEWPORT_MARGIN = 8

function horizontalPosition(event: MouseEvent, tooltipWidth: number): number {
  const centered = event.pageX - tooltipWidth / 2
  const minimum = window.scrollX + VIEWPORT_MARGIN
  const maximum =
    window.scrollX + window.innerWidth - tooltipWidth - VIEWPORT_MARGIN
  return Math.max(minimum, Math.min(maximum, centered))
}

function positionAboveOrBelow(
  event: MouseEvent,
  tooltipHeight: number
): number {
  const above = event.pageY - tooltipHeight - TOOLTIP_OFFSET
  const minimum = window.scrollY + VIEWPORT_MARGIN
  return above < minimum ? event.pageY + TOOLTIP_OFFSET : above
}

function verticalPosition(event: MouseEvent, tooltipHeight: number): number {
  const preferred = positionAboveOrBelow(event, tooltipHeight)
  const maximum =
    window.scrollY + window.innerHeight - tooltipHeight - VIEWPORT_MARGIN
  return Math.min(maximum, preferred)
}

export function calculateTooltipPosition(
  event: MouseEvent,
  tooltipEl: HTMLElement
): { x: number; y: number } {
  const tooltipWidth = tooltipEl.offsetWidth
  const tooltipHeight = tooltipEl.offsetHeight
  return {
    x: horizontalPosition(event, tooltipWidth),
    y: verticalPosition(event, tooltipHeight),
  }
}
