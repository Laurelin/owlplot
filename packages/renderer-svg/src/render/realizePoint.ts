import type { ContinuousScale, ScenePointNode } from '@owlplot/core'
import { buildTrianglePath, buildDiamondPath } from './pointShapePaths'

/** Single-scale: one y. Dual-scale: yLeft and yRight. No mixing. */
export type HoverScales =
  | { x: ContinuousScale; y: ContinuousScale }
  | { x: ContinuousScale; yLeft: ContinuousScale; yRight: ContinuousScale }

export function isDualScale(
  scales: HoverScales
): scales is {
  x: ContinuousScale
  yLeft: ContinuousScale
  yRight: ContinuousScale
} {
  return 'yLeft' in scales
}

/** Scale resolution context for POINT nodes (shared by DOM append and string serialize). */
export type PointRenderContext = {
  scales: HoverScales
  seriesYAxis: Record<string, 'left' | 'right'>
}

export type RealizedPointElement =
  | { tag: 'circle'; cx: number; cy: number; r: number }
  | { tag: 'rect'; x: number; y: number; width: number; height: number }
  | { tag: 'path'; d: string; transform: string }
  | {
      tag: 'text'
      x: number
      y: number
      text: string
      fontSize: number
      textAnchor: 'middle'
      dominantBaseline: 'central'
    }

function getYScaleForSeries(
  seriesId: string,
  ctx: PointRenderContext
): (v: number) => number {
  const side = ctx.seriesYAxis[seriesId] ?? 'left'
  if (isDualScale(ctx.scales)) {
    return side === 'right'
      ? ctx.scales.yRight.forward.bind(ctx.scales.yRight)
      : ctx.scales.yLeft.forward.bind(ctx.scales.yLeft)
  }
  return ctx.scales.y.forward.bind(ctx.scales.y)
}

/**
 * Realize a ScenePointNode into concrete SVG geometry (no DOM).
 * Returns null when seriesId is missing.
 */
export function realizePointNode(
  node: ScenePointNode,
  context: PointRenderContext
): RealizedPointElement | null {
  const seriesId = node.seriesId
  if (seriesId == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[owlplot] ScenePointNode requires seriesId; skipping point.'
      )
    }
    return null
  }

  const cx = context.scales.x.forward(node.x)
  const yScale = getYScaleForSeries(seriesId, context)
  const cy = yScale(node.y)
  const size = node.point.size
  const shape = node.point.shape

  if (shape.kind === 'circle') {
    return { tag: 'circle', cx, cy, r: size }
  }
  if (shape.kind === 'square') {
    // Circumradius = size => half-diagonal = size => side = size * sqrt(2)
    const halfSide = size * Math.SQRT1_2
    return {
      tag: 'rect',
      x: cx - halfSide,
      y: cy - halfSide,
      width: 2 * halfSide,
      height: 2 * halfSide,
    }
  }
  if (shape.kind === 'triangle') {
    return {
      tag: 'path',
      d: buildTrianglePath(size),
      transform: `translate(${cx},${cy})`,
    }
  }
  if (shape.kind === 'diamond') {
    return {
      tag: 'path',
      d: buildDiamondPath(size),
      transform: `translate(${cx},${cy})`,
    }
  }
  if (shape.kind === 'emoji') {
    return {
      tag: 'text',
      x: cx,
      y: cy,
      text: shape.value,
      fontSize: Math.round(size * 2),
      textAnchor: 'middle',
      dominantBaseline: 'central',
    }
  }
  // symbol (no registry yet) and unknown → circle fallback
  return { tag: 'circle', cx, cy, r: size }
}
