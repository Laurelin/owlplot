import type {
  TooltipRenderer,
  TooltipContext,
  TooltipRenderOptions,
  HoverSeriesStyle,
} from './types'
import type { TooltipDatum, TooltipPoint } from '@owlplot/core'
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

type HeaderPresentation = { kind: 'omit' } | { kind: 'header'; text: string }

function hasSemanticNumericX(context?: TooltipContext): boolean {
  if (!context) return false
  if (context.xFormatter) return true
  if (context.xUnit) return true
  return context.xScaleType === 'time' || context.xScaleType === 'log'
}

function tooltipFormat(context?: TooltipContext) {
  return context?.tooltipFormat ?? DEFAULT_TOOLTIP_FORMAT
}

function localeContext(context?: TooltipContext): { locale?: string } {
  return { locale: context?.locale }
}

function appendXUnit(value: string, context?: TooltipContext): string {
  if (!context?.xUnit) return value
  return `${value} ${context.xUnit}`
}

function formatNumericX(value: number, context?: TooltipContext): string {
  if (context?.xFormatter) return context.xFormatter(value)
  const formatted = formatValue(
    value,
    tooltipFormat(context),
    localeContext(context)
  )
  return appendXUnit(formatted, context)
}

function formatStringX(value: string, context?: TooltipContext): string {
  if (!context?.xFormatter) return value
  return context.xFormatter(value)
}

// x is semantic only when explicitly signaled; numeric shape alone is uncertain.
function resolveHeader(
  x: unknown,
  context?: TooltipContext
): HeaderPresentation {
  if (typeof x === 'string') {
    return { kind: 'header', text: formatStringX(x, context) }
  }
  if (typeof x !== 'number') return { kind: 'omit' }
  if (!hasSemanticNumericX(context)) return { kind: 'omit' }
  return { kind: 'header', text: formatNumericX(x, context) }
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

function createElement(
  tag: 'div' | 'span',
  className?: string,
  style?: Partial<CSSStyleDeclaration>
): HTMLElement {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (style) Object.assign(element.style, style)
  return element
}

function appendHeader(parent: HTMLElement, header: HeaderPresentation): void {
  if (header.kind === 'omit') return
  const element = createElement(
    'div',
    CssClassName.OWLPLOT_TOOLTIP_LABEL,
    styleHeaderX
  )
  element.textContent = header.text
  parent.appendChild(element)
}

function appendSwatch(
  row: HTMLElement,
  seriesStyle: HoverSeriesStyle | undefined
): void {
  if (typeof seriesStyle?.stroke !== 'string') {
    const spacer = createElement('span')
    spacer.setAttribute('aria-hidden', 'true')
    row.appendChild(spacer)
    return
  }
  const swatch = createElement('span', undefined, {
    display: 'inline-block',
    width: '11px',
    height: '11px',
    borderRadius: '2px',
    backgroundColor: seriesStyle.stroke,
    alignSelf: 'center',
  })
  row.appendChild(swatch)
}

function formatPointValue(
  point: TooltipPoint,
  context?: TooltipContext
): string {
  return formatValue(point.y, tooltipFormat(context), localeContext(context))
}

function appendSeriesRow(
  parent: HTMLElement,
  point: TooltipPoint,
  options?: TooltipRenderOptions
): void {
  const row = createElement('div', undefined, {
    display: 'grid',
    gridTemplateColumns: '12px auto max-content',
    columnGap: '6px',
    alignItems: 'baseline',
    marginBottom: '4px',
  })
  appendSwatch(row, options?.seriesStyles?.get(point.seriesId))
  const label = createElement(
    'div',
    CssClassName.OWLPLOT_TOOLTIP_LABEL,
    styleSeriesLabel
  )
  label.textContent = point.seriesId
  row.appendChild(label)
  const value = createElement(
    'div',
    CssClassName.OWLPLOT_TOOLTIP_VALUE,
    styleValue
  )
  value.textContent = formatPointValue(point, options?.context)
  row.appendChild(value)
  parent.appendChild(row)
}

function renderTooltip(
  datum: TooltipDatum,
  options?: TooltipRenderOptions
): HTMLElement {
  const element = createElement('div', CssClassName.OWLPLOT_TOOLTIP, styleBase)
  if (datum.points.length === 0) return element
  if (datum.points.length === 1) element.style.padding = SINGLE_SERIES_PADDING
  appendHeader(element, resolveHeader(datum.x, options?.context))
  for (const point of datum.points) appendSeriesRow(element, point, options)
  return element
}

export const defaultTooltipRenderer: TooltipRenderer = {
  render: renderTooltip,
}
