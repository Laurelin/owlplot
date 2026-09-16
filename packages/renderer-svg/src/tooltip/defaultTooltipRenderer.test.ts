import { beforeEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { TooltipKind, type TooltipDatum } from '@owlplot/core'
import { defaultTooltipRenderer } from './defaultTooltipRenderer'

const testGlobal = globalThis as unknown as { document: Document }

function datum(x: number | string, pointCount = 1): TooltipDatum {
  const points = Array.from({ length: pointCount }, (_, index) => ({
    seriesId: `series-${index + 1}`,
    x,
    y: (index + 1) * 1000,
  }))
  return {
    kind: pointCount > 1 ? TooltipKind.X_AXIS : TooltipKind.POINT,
    values: {},
    seriesId: points[0]?.seriesId,
    points,
    x,
  }
}

describe('default tooltip renderer', () => {
  beforeEach(() => {
    testGlobal.document = new JSDOM(
      '<!doctype html><body></body>'
    ).window.document
  })

  it('renders an empty tooltip for an empty point set', () => {
    const empty = { ...datum(1), points: [] }
    const element = defaultTooltipRenderer.render(empty)
    expect(element.children).toHaveLength(0)
  })

  it('omits uncertain numeric x and renders a spacer without series color', () => {
    const element = defaultTooltipRenderer.render(datum(2))
    expect(element.style.padding).toBe('6px')
    expect(element.children).toHaveLength(1)
    expect(element.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(element.textContent).toContain('series-1')
    expect(element.textContent).toContain('1000')
  })

  it('renders and formats a semantic string header', () => {
    const element = defaultTooltipRenderer.render(datum('Q1'), {
      context: { xFormatter: value => `Period ${value}` },
    })
    expect(element.firstElementChild?.textContent).toBe('Period Q1')
  })

  it('formats semantic numeric x with locale, unit, rows, and swatches', () => {
    const element = defaultTooltipRenderer.render(datum(1000, 2), {
      context: {
        xUnit: 'ms',
        locale: 'en-US',
        tooltipFormat: { mode: 'raw' },
      },
      seriesStyles: new Map([['series-1', { stroke: '#123456' }]]),
    })
    expect(element.firstElementChild?.textContent).toBe('1,000 ms')
    expect(element.querySelector('span')?.style.backgroundColor).toBe(
      'rgb(18, 52, 86)'
    )
    expect(element.textContent).toContain('2,000')
  })

  it('uses the numeric formatter for time and log scale headers', () => {
    const time = defaultTooltipRenderer.render(datum(5), {
      context: { xScaleType: 'time', xFormatter: value => `T${value}` },
    })
    const log = defaultTooltipRenderer.render(datum(10), {
      context: { xScaleType: 'log' },
    })
    expect(time.firstElementChild?.textContent).toBe('T5')
    expect(log.firstElementChild?.textContent).toBe('10')
  })
})
