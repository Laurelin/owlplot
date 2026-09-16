import { JSDOM } from 'jsdom'
import { TooltipKind, type TooltipDatum } from '@owlplot/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { customTooltipRenderer } from './tooltips'

beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.document = dom.window.document
})

describe('customTooltipRenderer', () => {
  it('renders each series point and the shared x context', () => {
    const datum: TooltipDatum = {
      kind: TooltipKind.X_AXIS,
      values: {},
      x: 2,
      points: [
        { seriesId: 'revenue', x: 2, y: 12 },
        { seriesId: 'expenses', x: 2, y: 7 },
      ],
    }

    const root = customTooltipRenderer.render(datum)
    const blocks = root.querySelectorAll('.tooltip-series-block')

    expect(root.classList.contains('tooltip-root')).toBe(true)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.textContent).toBe('revenue12')
    expect(blocks[1]?.textContent).toBe('expenses7')
    expect(
      root
        .querySelectorAll('.tooltip-swatch')[1]
        ?.getAttribute('data-series-index')
    ).toBe('1')
    expect(root.querySelector('.tooltip-x-context')?.textContent).toBe('x = 2')
  })

  it('renders x context when there are no points', () => {
    const datum: TooltipDatum = {
      kind: TooltipKind.X_AXIS,
      values: {},
      x: 4,
      points: [],
    }

    const root = customTooltipRenderer.render(datum)

    expect(root.querySelector('.tooltip-series-block')).toBeNull()
    expect(root.textContent).toBe('x = 4')
  })
})
