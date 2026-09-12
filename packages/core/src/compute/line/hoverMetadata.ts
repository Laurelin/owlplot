import type { CartesianSeries } from '../../config/types'
import type { CartesianScales } from '../cartesian2d/layout'
import type { ContinuousScaleDescriptor } from '../cartesian2d/scale'
import { toScaleDescriptor } from '../cartesian2d/scale'

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
 *
 * scales: serializable descriptors only (no forward/invert). Renderer hydrates
 * via createScaleFromDescriptor at consume time.
 */
export type HoverSeries = {
  id: string
  yAxis: 'left' | 'right'
  sortedPoints: ReadonlyArray<{ x: number; y: number }>
}

export type HoverMetadataSingle = {
  scales: { x: ContinuousScaleDescriptor; y: ContinuousScaleDescriptor }
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  yDomain: [number, number]
  series: HoverSeries[]
}

export type HoverMetadataDual = {
  scales: {
    x: ContinuousScaleDescriptor
    yLeft: ContinuousScaleDescriptor
    yRight: ContinuousScaleDescriptor
  }
  yDomainLeft: [number, number]
  yDomainRight: [number, number]
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  series: HoverSeries[]
}

export type HoverMetadata = HoverMetadataSingle | HoverMetadataDual

function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  )
}

function isScaleDescriptor(value: unknown): value is ContinuousScaleDescriptor {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  if (!isNumberPair(d.domain) || !isNumberPair(d.range)) return false
  if (d.type === 'linear') return true
  if (d.type === 'log') return typeof d.base === 'number'
  return false
}

/** Type guard: accepts serializable descriptor-shaped hover metadata from the scene. */
export function isHoverMetadata(value: unknown): value is HoverMetadata {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (
    !('scales' in v) ||
    !('plotRect' in v) ||
    !('xDomain' in v) ||
    !('series' in v)
  ) {
    return false
  }
  if (typeof v.scales !== 'object' || v.scales === null) return false
  if (!Array.isArray(v.series)) return false
  if (!isNumberPair(v.xDomain)) return false

  const scales = v.scales as Record<string, unknown>
  if (!isScaleDescriptor(scales.x)) return false

  if ('yLeft' in scales && 'yRight' in scales) {
    return (
      isScaleDescriptor(scales.yLeft) &&
      isScaleDescriptor(scales.yRight) &&
      isNumberPair(v.yDomainLeft) &&
      isNumberPair(v.yDomainRight)
    )
  }

  return isScaleDescriptor(scales.y) && isNumberPair(v.yDomain)
}

export function buildHoverMetadata(
  seriesList: CartesianSeries[],
  scales: CartesianScales,
  plotRect: { x: number; y: number; width: number; height: number },
  xDomain: [number, number],
  yDomain: [number, number],
  yDomainLeft?: [number, number],
  yDomainRight?: [number, number]
): HoverMetadata {
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
          x: toScaleDescriptor(scales.x),
          yLeft: toScaleDescriptor(scales.yLeft),
          yRight: toScaleDescriptor(scales.yRight),
        },
        yDomainLeft: yDomainLeft!,
        yDomainRight: yDomainRight!,
        plotRect,
        xDomain,
        series: seriesPayload,
      }
    : {
        scales: {
          x: toScaleDescriptor(scales.x),
          y: toScaleDescriptor(scales.y),
        },
        plotRect,
        xDomain,
        yDomain,
        series: seriesPayload,
      }
}
