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

function shouldStripCompact(
  format: NumberFormat | undefined,
  context: FormatValueContext | undefined
): boolean {
  if (context?.stripCompactInTooltip !== true) return false
  return format?.mode === 'compact'
}

function resolveFormat(
  format: NumberFormat | undefined,
  context: FormatValueContext | undefined
): NumberFormat {
  if (shouldStripCompact(format, context)) return { mode: 'raw' }
  return format ?? { mode: 'raw' }
}

function resolveFormatContext(
  context: FormatValueContext | undefined
): FormatContext | undefined {
  if (!context?.locale) return undefined
  return { locale: context.locale }
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
  return formatNumber(
    value,
    resolveFormat(format, context),
    resolveFormatContext(context)
  )
}
