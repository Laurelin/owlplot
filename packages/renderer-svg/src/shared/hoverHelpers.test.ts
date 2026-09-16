import { afterEach, describe, expect, it } from 'vitest'
import { binarySearchNearestByX } from './binarySearchNearestByX'
import { getMouseSvgCoordinates } from './svgCoordinates'

const originalDOMPoint = globalThis.DOMPoint

afterEach(() => {
  globalThis.DOMPoint = originalDOMPoint
})

describe('binarySearchNearestByX', () => {
  const points = [{ x: 1 }, { x: 4 }, { x: 9 }, { x: 20 }]

  it('handles empty, lower-bound, exact, nearer-previous, and nearer-current', () => {
    expect(binarySearchNearestByX([], 3)).toBeNull()
    expect(binarySearchNearestByX(points, -5)).toBe(points[0])
    expect(binarySearchNearestByX(points, 9)).toBe(points[2])
    expect(binarySearchNearestByX(points, 6)).toBe(points[1])
    expect(binarySearchNearestByX(points, 8)).toBe(points[2])
    expect(binarySearchNearestByX(points, 100)).toBe(points[3])
  })
})

describe('getMouseSvgCoordinates', () => {
  it('returns null without a screen transform', () => {
    const svg = {
      createSVGPoint: () => ({ x: 0, y: 0 }),
      getScreenCTM: () => null,
    } as unknown as SVGSVGElement
    expect(
      getMouseSvgCoordinates(svg, {
        clientX: 10,
        clientY: 20,
      } as PointerEvent)
    ).toBeNull()
  })

  it('uses DOMPoint and the inverse screen transform', () => {
    class TestDOMPoint {
      constructor(
        public x: number,
        public y: number
      ) {}
      matrixTransform() {
        return { x: this.x + 1, y: this.y + 2 }
      }
    }
    globalThis.DOMPoint = TestDOMPoint as unknown as typeof DOMPoint
    const svg = {
      getScreenCTM: () => ({ inverse: () => ({}) }),
    } as unknown as SVGSVGElement
    expect(
      getMouseSvgCoordinates(svg, {
        clientX: 10,
        clientY: 20,
      } as PointerEvent)
    ).toEqual({ x: 11, y: 22 })
  })

  it('falls back to createSVGPoint when DOMPoint is unavailable', () => {
    globalThis.DOMPoint = undefined as unknown as typeof DOMPoint
    const point = {
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x * 2, y: this.y * 3 }
      },
    }
    const svg = {
      createSVGPoint: () => point,
      getScreenCTM: () => ({ inverse: () => ({}) }),
    } as unknown as SVGSVGElement
    expect(
      getMouseSvgCoordinates(svg, {
        clientX: 4,
        clientY: 5,
      } as PointerEvent)
    ).toEqual({ x: 8, y: 15 })
  })
})
