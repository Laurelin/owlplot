import { beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { HoverIndicatorKind } from '../../shared/enums'
import { createIndicators } from './indicators'

const testGlobal = globalThis as unknown as { document: Document }

function scale(multiplier = 1) {
  return {
    type: 'linear' as const,
    domain: [0, 100] as const,
    range: [0, 100] as const,
    forward: (value: number) => value * multiplier,
    invert: (value: number) => value / multiplier,
  }
}

describe('indicator composition', () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    testGlobal.document = new JSDOM(
      '<!doctype html><body></body>'
    ).window.document
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  })

  it('builds explicit indicator modes and omits NONE', () => {
    const indicators = createIndicators(
      [
        { kind: HoverIndicatorKind.NONE },
        { kind: HoverIndicatorKind.POINT_EMPHASIS, size: 6 },
        { kind: HoverIndicatorKind.X_LINE },
        { kind: HoverIndicatorKind.Y_LINE },
      ],
      svg
    )
    expect(indicators.map(indicator => indicator.id)).toEqual([
      'point-emphasis',
      'x-line',
      'y-line',
    ])
  })

  it('renders, keys, and restores overlay point emphasis', () => {
    const [indicator] = createIndicators(
      [
        {
          kind: HoverIndicatorKind.POINT_EMPHASIS,
          radius: 4,
          style: { stroke: 'red', strokeWidth: 2 },
        },
      ],
      svg
    )
    const context = {
      svg,
      scales: { x: scale(), y: scale() },
      plotRect: { x: 0, y: 0, width: 100, height: 100 },
    }
    const result = {
      kind: 'points' as const,
      points: [{ seriesId: 's1', point: { x: 2, y: 3 } }],
      primaryIndex: 0,
    }
    expect(indicator!.getKey?.(result, context)).toBe('s1:2')
    expect(indicator!.getKey?.({ kind: 'none' }, context)).toBeNull()
    expect(indicator!.render({ kind: 'none' }, context)).toBeNull()
    const handle = indicator!.render(result, context)
    expect(svg.querySelector('circle')).not.toBeNull()
    indicator!.restore(handle)
    expect(svg.querySelector('circle')).toBeNull()
  })

  it('renders and hides x and y lines for single and dual scales', () => {
    const [xIndicator, yIndicator] = createIndicators(
      [
        { kind: HoverIndicatorKind.X_LINE },
        { kind: HoverIndicatorKind.Y_LINE },
      ],
      svg
    )
    const result = {
      kind: 'points' as const,
      points: [{ seriesId: 'right', point: { x: 2, y: 3 } }],
      primaryIndex: 0,
    }
    const singleContext = {
      svg,
      scales: { x: scale(), y: scale() },
      plotRect: { x: 0, y: 0, width: 100, height: 100 },
    }
    expect(xIndicator!.render(result, singleContext)).not.toBeNull()
    expect(yIndicator!.render(result, singleContext)).not.toBeNull()

    const dualContext = {
      ...singleContext,
      scales: { x: scale(), yLeft: scale(), yRight: scale(10) },
      seriesYAxis: { right: 'right' as const },
    }
    expect(yIndicator!.render(result, dualContext)).not.toBeNull()
    expect(svg.querySelector('line:last-of-type')?.getAttribute('y1')).toBe(
      '30'
    )
    expect(xIndicator!.render({ kind: 'none' }, singleContext)).toBeNull()
    expect(yIndicator!.render({ kind: 'none' }, singleContext)).toBeNull()
    xIndicator!.restore(null)
    yIndicator!.restore(null)
  })
})
