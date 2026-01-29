import type { TooltipRenderer, TooltipDatum } from '@owlplot/renderer-svg'
import { formatValue } from '@owlplot/renderer-svg'

export const customTooltipRenderer: TooltipRenderer = {
  render(datum: TooltipDatum) {
    const root = document.createElement('div')
    root.classList.add('tooltip-root')

    if (datum.points && datum.points.length > 0) {
      datum.points.forEach((point, i) => {
        const block = document.createElement('div')
        block.classList.add('tooltip-series-block')

        const header = document.createElement('div')
        header.classList.add('tooltip-series-header')
        header.textContent = point.seriesId

        const valueRow = document.createElement('div')
        valueRow.classList.add('tooltip-row')
        const swatch = document.createElement('span')
        swatch.classList.add('tooltip-swatch')
        swatch.setAttribute('data-series-index', String(i))
        const value = document.createElement('span')
        value.classList.add('tooltip-value')
        value.textContent = formatValue(point.y)
        valueRow.appendChild(swatch)
        valueRow.appendChild(value)

        block.appendChild(header)
        block.appendChild(valueRow)
        root.appendChild(block)
      })
    }

    const xRow = document.createElement('div')
    xRow.classList.add('tooltip-x-context')
    xRow.textContent = `x = ${formatValue(datum.x)}`
    root.appendChild(xRow)

    return root
  },
}
