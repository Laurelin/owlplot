export type RotatedBounds = {
  width: number
  height: number
}

export function measureRotatedBoundingBox(
  width: number,
  height: number,
  radians: number
): RotatedBounds {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    width: Math.abs(width * cos) + Math.abs(height * sin),
    height: Math.abs(width * sin) + Math.abs(height * cos),
  }
}
