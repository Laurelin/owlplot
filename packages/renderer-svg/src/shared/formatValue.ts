import { formatRaw, formatNumber, type NumberFormat } from '@owlplot/core'

/**
 * Format a value for display (e.g. tooltips). Default: raw (no rounding).
 * Only apply formatting if caller passes a format (e.g. from tooltipFormat).
 * Always format from the raw datum, never from axis labels or scene text.
 */
export function formatValue(value: unknown, format?: NumberFormat): string {
  if (typeof value === 'number') {
    return format ? formatNumber(value, format, undefined) : formatRaw(value)
  }
  return String(value)
}
