import type { CartesianSeries } from '../../config/types'
import type { CartesianScales } from '../cartesian2d/layout'

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
  seriesList: CartesianSeries[],
  scales: CartesianScales,
  plotRect: { x: number; y: number; width: number; height: number },
  xDomain: [number, number],
  yDomain: [number, number],
  yDomainLeft?: [number, number],
  yDomainRight?: [number, number]
) {
  const isDualScale = 'yLeft' in scales && 'yRight' in scales
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
        scales: {
          x: scales.x,
          yLeft: scales.yLeft,
          yRight: scales.yRight,
        },
        yDomainLeft: yDomainLeft!,
        yDomainRight: yDomainRight!,
        plotRect,
        xDomain,
        series: seriesPayload,
      }
    : {
        scales: { x: scales.x, y: scales.y },
        plotRect,
        xDomain,
        yDomain,
        series: seriesPayload,
      }
}
