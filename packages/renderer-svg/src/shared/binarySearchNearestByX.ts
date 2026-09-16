function lowerBoundByX<T extends { x: number }>(
  points: ReadonlyArray<T>,
  targetX: number
): number {
  let left = 0
  let right = points.length - 1
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    const midPoint = points[mid]
    if (!midPoint) break
    if (midPoint.x < targetX) left = mid + 1
    else right = mid
  }
  return left
}

function chooseNearest<T extends { x: number }>(
  points: ReadonlyArray<T>,
  targetX: number,
  index: number
): T {
  if (index === 0) return points[index]!
  const currentDistance = Math.abs(points[index]!.x - targetX)
  const previousDistance = Math.abs(points[index - 1]!.x - targetX)
  return previousDistance < currentDistance
    ? points[index - 1]!
    : points[index]!
}

export function binarySearchNearestByX<T extends { x: number }>(
  points: ReadonlyArray<T>,
  targetX: number
): T | null {
  if (points.length === 0) return null
  return chooseNearest(points, targetX, lowerBoundByX(points, targetX))
}
