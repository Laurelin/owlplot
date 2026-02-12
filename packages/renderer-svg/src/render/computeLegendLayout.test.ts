import { describe, expect, it } from 'vitest'
import { computeLegendLayout } from './computeLegendLayout'

describe('computeLegendLayout', () => {
  it('is deterministic for identical inputs', () => {
    const input = {
      placement: 'outside' as const,
      anchor: 'bottom-center' as const,
      direction: 'row' as const,
      overlapPolicy: 'allow' as const,
      padding: 8,
      axisToLegendGap: 12,
      offsetX: 0,
      offsetY: 0,
      gap: 20,
      chartRect: { x: 0, y: 0, width: 300, height: 180 },
      plotRect: { x: 40, y: 20, width: 220, height: 120 },
      itemSizes: [
        { width: 72, height: 14 },
        { width: 72, height: 14 },
      ],
    }

    const first = computeLegendLayout(input)
    const second = computeLegendLayout(input)

    expect(first).toEqual(second)
  })

  it('inside + avoid-frame anchors to plotRect (top-right)', () => {
    const result = computeLegendLayout({
      placement: 'inside',
      anchor: 'top-right',
      direction: 'row',
      overlapPolicy: 'avoid-frame',
      padding: 8,
      axisToLegendGap: 0,
      offsetX: 0,
      offsetY: 0,
      gap: 20,
      chartRect: { x: 0, y: 0, width: 300, height: 180 },
      plotRect: { x: 40, y: 20, width: 220, height: 120 },
      itemSizes: [{ width: 72, height: 14 }],
    })

    expect(result.reserved).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(result.box.x).toBe(180)
    expect(result.box.y).toBe(28)
  })

  it('outside right-center reserves right space and centers vertically', () => {
    const result = computeLegendLayout({
      placement: 'outside',
      anchor: 'right-center',
      direction: 'column',
      overlapPolicy: 'avoid-frame',
      padding: 8,
      axisToLegendGap: 12,
      offsetX: 0,
      offsetY: 0,
      gap: 10,
      chartRect: { x: 0, y: 0, width: 300, height: 180 },
      plotRect: { x: 40, y: 20, width: 220, height: 120 },
      itemSizes: [
        { width: 90, height: 18 },
        { width: 90, height: 18 },
      ],
    })

    expect(result.reserved.right).toBe(118)
    expect(result.reserved.left).toBe(0)
    expect(result.box.x).toBe(320)
    expect(result.box.y).toBe(67)
  })
})
