import { describe, expect, it } from 'vitest'
import { derivePaintStylesFromColor, normalizeGradientPaint } from './helpers'

describe('normalizeGradientPaint', () => {
  it('sorts stops, injects endpoints, and defaults linear direction', () => {
    expect(
      normalizeGradientPaint({
        type: 'linear',
        stops: [
          { offset: 0.8, color: '#fff' },
          { offset: 0.2, color: '#000' },
        ],
      })
    ).toEqual({
      type: 'linear',
      direction: 'horizontal',
      stops: [
        { offset: 0, color: '#000' },
        { offset: 0.2, color: '#000' },
        { offset: 0.8, color: '#fff' },
        { offset: 1, color: '#fff' },
      ],
    })
  })

  it('preserves radial gradients with endpoints and tied stops', () => {
    const stops = [
      { offset: 0, color: '#000' },
      { offset: 0.5, color: '#333' },
      { offset: 0.5, color: '#666' },
      { offset: 1, color: '#fff' },
    ]
    expect(normalizeGradientPaint({ type: 'radial', stops })).toEqual({
      type: 'radial',
      stops,
    })
  })

  it('rejects too few stops and out-of-range offsets', () => {
    expect(() =>
      normalizeGradientPaint({
        type: 'linear',
        stops: [{ offset: 0, color: '#000' }],
      })
    ).toThrow('at least 2 stops')
    expect(() =>
      normalizeGradientPaint({
        type: 'radial',
        stops: [
          { offset: -0.1, color: '#000' },
          { offset: 1, color: '#fff' },
        ],
      })
    ).toThrow('range [0, 1]')
    expect(() =>
      normalizeGradientPaint({
        type: 'radial',
        stops: [
          { offset: 0, color: '#000' },
          { offset: 1.1, color: '#fff' },
        ],
      })
    ).toThrow('range [0, 1]')
  })
})

describe('derivePaintStylesFromColor', () => {
  it('derives only solid base styles by default', () => {
    expect(derivePaintStylesFromColor('#336699')).toEqual({
      fill: { type: 'solid', color: '#336699' },
      stroke: { type: 'solid', color: '#336699' },
    })
  })

  it('derives gradient base styles without implicit interaction styles', () => {
    const styles = derivePaintStylesFromColor('#336699', {
      enableGradients: true,
      gradientDirection: 'vertical',
    })
    expect(styles.fill).toMatchObject({
      type: 'linear',
      direction: 'vertical',
    })
    expect(styles.stroke).toEqual({ type: 'solid', color: '#336699' })
    expect(styles.hoverFill).toBeUndefined()
  })

  it('derives solid interaction styles when either state is configured', () => {
    const styles = derivePaintStylesFromColor('#336699', {
      hoverBrightness: 0.2,
    })
    expect(styles.hoverFill).toMatchObject({ type: 'solid' })
    expect(styles.hoverStroke).toMatchObject({ type: 'solid' })
    expect(styles.activeFill).toMatchObject({ type: 'solid' })
    expect(styles.activeStroke).toMatchObject({ type: 'solid' })
  })

  it('derives gradient interaction fills and strokes', () => {
    const styles = derivePaintStylesFromColor('#336699', {
      enableGradients: true,
      activeBrightness: 0.25,
    })
    expect(styles.hoverFill).toMatchObject({
      type: 'linear',
      stops: expect.any(Array),
    })
    expect(styles.hoverStroke).toMatchObject({
      type: 'linear',
      stops: expect.any(Array),
    })
    expect(styles.activeFill).toMatchObject({ type: 'linear' })
    expect(styles.activeStroke).toMatchObject({ type: 'linear' })
  })
})
