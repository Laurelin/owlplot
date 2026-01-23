import type { TooltipRenderer } from './types'
import { formatValue } from '../shared/formatValue'
import { TooltipKind, CssClassName } from '../shared/enums'

export const defaultTooltipRenderer: TooltipRenderer = {
  render(datum) {
    const el = document.createElement('div')
    el.className = CssClassName.OWLPLOT_TOOLTIP

    // Apply default styles
    el.style.background = '#ffffff'
    el.style.border = '1px solid #e0e0e0'
    el.style.borderRadius = '4px'
    el.style.padding = '8px'
    el.style.fontSize = '11px'
    el.style.color = '#333'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    el.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    el.style.lineHeight = '1.4'

    let html = ''

    if (datum.kind === TooltipKind.X_AXIS) {
      // Special handling for x-axis hover
      html += `<div class="${CssClassName.OWLPLOT_TOOLTIP_LABEL}" style="font-weight: 600; margin-bottom: 4px;">x: ${formatValue(datum.values.x)}</div>`
      // Show each series value (may be empty for charts without point geometry)
      for (const [key, value] of Object.entries(datum.values)) {
        if (key === 'x') continue
        html += `<div class="${CssClassName.OWLPLOT_TOOLTIP_VALUE}" style="margin-bottom: 2px;">${key}: ${formatValue(value)}</div>`
      }
      // If no series data, tooltip still shows x value (data resolution, not geometry)
    } else {
      // Existing handling for other kinds
      // Label if present
      if (datum.label) {
        html += `<div class="${CssClassName.OWLPLOT_TOOLTIP_LABEL}" style="font-weight: 600; margin-bottom: 4px;">${datum.label}</div>`
      }

      // Series ID if present
      if (datum.seriesId) {
        html += `<div class="${CssClassName.OWLPLOT_TOOLTIP_SERIES}" style="margin-bottom: 2px;">series: ${datum.seriesId}</div>`
      }

      // Iterate over all values
      for (const [key, value] of Object.entries(datum.values)) {
        html += `<div class="${CssClassName.OWLPLOT_TOOLTIP_VALUE}" style="margin-bottom: 2px;">${key}: ${formatValue(value)}</div>`
      }
    }

    el.innerHTML = html
    return el
  },
}
