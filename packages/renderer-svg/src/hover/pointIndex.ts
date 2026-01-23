import { DataAttributeName } from '../shared/enums'
import type { HoverPointRef } from '../shared/extendedElements'

// Re-export for convenience
export type { HoverPointRef }

export function buildPointIndexFromRenderedElements(
  svg: SVGSVGElement
): Map<string, HoverPointRef[]> {
  const index = new Map<string, HoverPointRef[]>()
  const circles = svg.querySelectorAll(
    `circle[data-${DataAttributeName.OWLPLOT_SERIES_ID}]`
  )

  circles.forEach(circle => {
    const el = circle as SVGCircleElement
    const seriesId = el.dataset[DataAttributeName.OWLPLOT_SERIES_ID]
    const domainX = parseFloat(el.dataset[DataAttributeName.OWLPLOT_X] || '')
    const domainY = parseFloat(el.dataset[DataAttributeName.OWLPLOT_Y] || '')

    if (!seriesId || Number.isNaN(domainX) || Number.isNaN(domainY)) return

    const seriesRefs = index.get(seriesId) ?? []
    seriesRefs.push({ element: el, seriesId, x: domainX, y: domainY })
    index.set(seriesId, seriesRefs)
  })

  for (const refs of index.values()) refs.sort((a, b) => a.x - b.x)
  return index
}
