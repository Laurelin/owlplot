/** Dense-line canvas-gate fixture: one series, ~50k points. */
export const DENSE_LINE_POINT_COUNT = 50_000

export function buildDenseLinePoints(
  count: number = DENSE_LINE_POINT_COUNT
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < count; i += 1) {
    const x = i
    const y = 50 + 25 * Math.sin(i / 40) + 10 * Math.sin(i / 7)
    points.push({ x, y })
  }
  return points
}
