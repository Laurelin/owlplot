import type { LineSeries } from '../../config/types'

/**
 * Core -> Renderer Contract for Hover Metadata:
 *
 * hover.sortedPoints:
 * - filtered (finite x/y, y !== null)
 * - sorted ascending by x
 * - immutable for renderer lifetime (frozen)
 *
 * Renderer MUST use sortedPoints directly - NO per-hover sorting or filtering.
 * This is a one-time cost during scene computation, not per mousemove.
 */
export type HoverSeries = {
  id: string
  yAxis: 'left' | 'right'
  sortedPoints: ReadonlyArray<{ x: number; y: number }>
}

export function buildHoverMetadata(
  seriesList: LineSeries[],
  scales: {
    x: (value: number) => number
    y: (value: number) => number
    xInvert: (px: number) => number
    yInvert: (py: number) => number
    yLeft?: (value: number) => number
    yRight?: (value: number) => number
    yInvertLeft?: (py: number) => number
    yInvertRight?: (py: number) => number
  },
  plotRect: { x: number; y: number; width: number; height: number },
  xDomain: [number, number],
  yDomain: [number, number],
  yDomainLeft?: [number, number],
  yDomainRight?: [number, number]
) {
  const isDualScale = scales.yLeft !== undefined && scales.yRight !== undefined
  const seriesPayload = seriesList.map((s): HoverSeries => {
    const validPoints = s.points
      .filter(p => p.y !== null && Number.isFinite(p.x) && Number.isFinite(p.y))
      .map(p => ({ x: p.x, y: p.y! }))
      .sort((a, b) => a.x - b.x)
    const sortedPoints = Object.freeze(validPoints)
    return {
      id: s.id,
      yAxis: isDualScale ? (s.yAxis ?? 'left') : 'left',
      sortedPoints,
    }
  })

  return isDualScale
    ? {
        xInvert: scales.xInvert,
        scales: {
          x: scales.x,
          yLeft: scales.yLeft!,
          yRight: scales.yRight!,
        },
        yInvertLeft: scales.yInvertLeft!,
        yInvertRight: scales.yInvertRight!,
        yDomainLeft: yDomainLeft!,
        yDomainRight: yDomainRight!,
        plotRect,
        xDomain,
        series: seriesPayload,
      }
    : {
        xInvert: scales.xInvert,
        yInvert: scales.yInvert,
        scales: { x: scales.x, y: scales.y },
        plotRect,
        xDomain,
        yDomain,
        series: seriesPayload,
      }
}
