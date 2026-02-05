import type { TooltipRenderer, TooltipContext } from './types'
import { formatValue } from '../shared/formatValue'
import { CssClassName } from '../shared/enums'

const DEFAULT_TOOLTIP_FORMAT = { mode: 'raw' as const }

/**
 * internal layout concept (not exported):
 * - header (optional): single dominant line; used for semantic x when signaled.
 * - body: series rows from points (canonical) — seriesId as label, y as value.
 * - footer (optional): reserved, unused by default.
 * default ordering: 1) header (if any), 2) body (series rows), 3) footer (reserved).
 */

type XPresentation = 'header' | 'omit'

// x is semantic only when explicitly signaled.
// we never infer meaning from numeric shape.
// uncertain numeric x is intentionally omitted.
function resolveXPresentation(
  datum: { x: unknown },
  context: TooltipContext | undefined
): XPresentation {
  if (typeof datum.x === 'string') return 'header'
  if (typeof datum.x === 'number') {
    if (context?.xFormatter ?? context?.xUnit) return 'header'
    if (context?.xScaleType === 'time' || context?.xScaleType === 'log')
      return 'header'
    return 'omit'
  }
  return 'omit'
}

// object-based styles only; avoid cssText to prevent accidental overwrites
const styleBase: Partial<CSSStyleDeclaration> = {
  background: '#ffffff',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  padding: '8px',
  fontSize: '12px',
  color: '#333',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  lineHeight: '1.4',
}

const styleHeaderX: Partial<CSSStyleDeclaration> = {
  fontWeight: '700',
  fontSize: '13px',
  marginBottom: '6px',
  paddingBottom: '4px',
  borderBottom: '1px solid #eee',
}

const styleSeriesLabel: Partial<CSSStyleDeclaration> = {
  fontWeight: '700',
  fontSize: '12px',
}

const styleValue: Partial<CSSStyleDeclaration> = {
  textAlign: 'right',
}

const SINGLE_SERIES_PADDING = '6px'

export const defaultTooltipRenderer: TooltipRenderer = {
  render(datum, options) {
    const el = document.createElement('div')
    el.className = CssClassName.OWLPLOT_TOOLTIP
    Object.assign(el.style, styleBase)

    if (datum.points.length === 0) return el

    const isSingleSeries = datum.points.length === 1
    // reduced padding when only one series is shown
    if (isSingleSeries) el.style.padding = SINGLE_SERIES_PADDING

    const context = options?.context
    const xPresentation = resolveXPresentation(datum, context)

    // --- header (optional): only when x is semantic
    if (xPresentation === 'header') {
      const headerEl = document.createElement('div')
      headerEl.className = CssClassName.OWLPLOT_TOOLTIP_LABEL
      Object.assign(headerEl.style, styleHeaderX)

      if (typeof datum.x === 'string') {
        headerEl.textContent = context?.xFormatter?.(datum.x) ?? datum.x
      } else {
        const formatted =
          context?.xFormatter?.(datum.x) ??
          formatValue(
            datum.x,
            context?.tooltipFormat ?? DEFAULT_TOOLTIP_FORMAT,
            {
              locale: context?.locale,
            }
          )
        headerEl.textContent = context?.xUnit
          ? `${formatted} ${context.xUnit}`
          : formatted
      }

      el.appendChild(headerEl)
    }

    // body is always series rows; never x-derived.
    const seriesStyles = options?.seriesStyles

    for (const point of datum.points) {
      const row = document.createElement('div')
      Object.assign(row.style, {
        display: 'grid',
        gridTemplateColumns: '12px auto max-content',
        columnGap: '6px',
        alignItems: 'baseline',
        marginBottom: '4px',
      })

      const seriesStyle = seriesStyles?.get(point.seriesId)
      const stroke = seriesStyle?.stroke

      if (typeof stroke === 'string') {
        const swatch = document.createElement('span')
        Object.assign(swatch.style, {
          display: 'inline-block',
          width: '11px',
          height: '11px',
          borderRadius: '2px',
          backgroundColor: stroke,
          // text aligns on baseline; icon centers optically
          alignSelf: 'center',
        })
        row.appendChild(swatch)
      } else {
        const spacer = document.createElement('span')
        spacer.setAttribute('aria-hidden', 'true')
        row.appendChild(spacer)
      }

      const labelEl = document.createElement('div')
      labelEl.className = CssClassName.OWLPLOT_TOOLTIP_LABEL
      Object.assign(labelEl.style, styleSeriesLabel)
      labelEl.textContent = point.seriesId
      row.appendChild(labelEl)

      const valueEl = document.createElement('div')
      valueEl.className = CssClassName.OWLPLOT_TOOLTIP_VALUE
      Object.assign(valueEl.style, styleValue)
      valueEl.textContent = formatValue(
        point.y,
        context?.tooltipFormat ?? DEFAULT_TOOLTIP_FORMAT,
        { locale: context?.locale }
      )
      row.appendChild(valueEl)

      el.appendChild(row)
    }

    // --- footer (reserved): unused by default
    return el
  },
}
