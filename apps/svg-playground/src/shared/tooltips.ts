import type { TooltipRenderer, TooltipDatum } from '@owlplot/renderer-svg'
import { formatValue } from '@owlplot/renderer-svg'

export const customTooltipRenderer: TooltipRenderer = {
  render(datum: TooltipDatum) {
    const root = document.createElement('div')
    root.classList.add('tooltip-root')

    const xValue = datum.x !== undefined ? formatValue(datum.x) : 'N/A'
    const xRow = document.createElement('div')
    xRow.classList.add('tooltip-row')
    xRow.innerHTML = `<div class="tooltip-label">X: ${xValue}</div>`
    root.appendChild(xRow)

    if (datum.series && datum.series.length > 0) {
      datum.series.forEach((s, i) => {
        const row = document.createElement('div')
        row.classList.add('tooltip-row')

        const swatch = document.createElement('span')
        swatch.classList.add('tooltip-swatch')
        swatch.setAttribute('data-series-index', String(i))

        const label = document.createElement('span')
        label.classList.add('tooltip-label')
        label.textContent = `${s.seriesId}:`

        const value = document.createElement('span')
        value.classList.add('tooltip-value')
        value.textContent = s.y !== undefined ? formatValue(s.y) : 'N/A'

        row.appendChild(swatch)
        row.appendChild(label)
        row.appendChild(value)
        root.appendChild(row)
      })
    }

    return root
  },
}
