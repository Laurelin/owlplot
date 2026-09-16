import type { TooltipRenderer, TooltipDatum } from '@owlplot/renderer-svg'
import { formatValue } from '@owlplot/renderer-svg'

function createSeriesBlock(
  point: NonNullable<TooltipDatum['points']>[number],
  index: number
): HTMLDivElement {
  const block = document.createElement('div')
  block.classList.add('tooltip-series-block')

  const header = document.createElement('div')
  header.classList.add('tooltip-series-header')
  header.textContent = point.seriesId

  const valueRow = document.createElement('div')
  valueRow.classList.add('tooltip-row')
  const swatch = document.createElement('span')
  swatch.classList.add('tooltip-swatch')
  swatch.setAttribute('data-series-index', String(index))
  const value = document.createElement('span')
  value.classList.add('tooltip-value')
  value.textContent = formatValue(point.y)
  valueRow.append(swatch, value)
  block.append(header, valueRow)
  return block
}

function createXContext(x: TooltipDatum['x']): HTMLDivElement {
  const row = document.createElement('div')
  row.classList.add('tooltip-x-context')
  row.textContent = `x = ${formatValue(x)}`
  return row
}

export const customTooltipRenderer: TooltipRenderer = {
  render(datum: TooltipDatum) {
    const root = document.createElement('div')
    root.classList.add('tooltip-root')
    const seriesBlocks = (datum.points ?? []).map(createSeriesBlock)
    root.append(...seriesBlocks, createXContext(datum.x))
    return root
  },
}
