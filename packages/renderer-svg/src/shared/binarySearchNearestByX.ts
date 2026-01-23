export function binarySearchNearestByX<T extends { x: number }>(
  points: ReadonlyArray<T>,
  targetX: number
): T | null {
  if (points.length === 0) return null

  let left = 0
  let right = points.length - 1

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    const midPoint = points[mid]
    if (!midPoint) break
    if (midPoint.x < targetX) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  // Check which is closer: left or left-1
  if (left > 0 && left < points.length) {
    const distLeft = Math.abs(points[left]!.x - targetX)
    const distPrev = Math.abs(points[left - 1]!.x - targetX)
    if (distPrev < distLeft) {
      return points[left - 1]!
    }
  }

  return points[left]!
}
