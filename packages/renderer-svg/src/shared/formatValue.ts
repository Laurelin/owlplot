import {
  formatNumber,
  type FormatContext,
  type NumberFormat,
} from '@owlplot/core'

export type FormatValueContext = {
  locale?: string
  /**
   * When true, strip compact from format (use raw instead). Use for tooltip paths where format might have been derived from axis.
   * When false or omitted, use format as-is (e.g. explicit tooltipFormat from user may be compact).
   */
  stripCompactInTooltip?: boolean
}

/**
 * Format a value for display (e.g. tooltips). Default: raw (no rounding).
 * Only apply formatting if caller passes a format (e.g. from tooltipFormat).
 * Always format from the raw datum, never from axis labels or scene text.
 * Tooltip format must only come from options.tooltipFormat; never derive from axis.
 */
export function formatValue(
  value: unknown,
  format?: NumberFormat,
  context?: FormatValueContext
): string {
  if (typeof value !== 'number') return String(value)
  const effectiveFormat =
    context?.stripCompactInTooltip && format?.mode === 'compact'
      ? { mode: 'raw' as const }
      : format
  const formatContext: FormatContext | undefined =
    context?.locale !== undefined && context.locale !== ''
      ? { locale: context.locale }
      : undefined
  const mode = effectiveFormat ?? { mode: 'raw' as const }
  return formatNumber(value, mode, formatContext)
}
