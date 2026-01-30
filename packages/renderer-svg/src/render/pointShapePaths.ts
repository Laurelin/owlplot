/**
 * Point shape path builders in local space, centered at (0,0).
 * Circumradius rule: size = distance from center to farthest vertex/point.
 */

/** Equilateral triangle, point up; circumradius = size. */
export function buildTrianglePath(size: number): string {
  const r = size
  const h = r * 0.5
  const w = (r * Math.sqrt(3)) / 2
  return `M 0 ${-r} L ${w} ${h} L ${-w} ${h} Z`
}

/** Diamond (square rotated 45°); circumradius = size. Vertices at (0,-r), (r,0), (0,r), (-r,0). */
export function buildDiamondPath(size: number): string {
  const r = size
  return `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`
}
