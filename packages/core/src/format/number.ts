/**
 * Number formatting: raw (inspection), decimals, significant figures, compact.
 * format === undefined means AUTO (axis tick step–based decimals only).
 * No heuristics outside this file. Formatter answers how to format only; axis/layout owns policy (e.g. when to compact).
 */

export type NumberFormat =
  | { mode: 'raw' }
  | { mode: 'decimals'; decimals: number }
  | { mode: 'significantFigures'; significantFigures: number }
  | {
      mode: 'compact'
      locale?: string
      maximumFractionDigits?: number
    }

/**
 * Context for formatNumber. Only tickStep (AUTO decimals) and locale (presentation).
 * No axis policy (e.g. compactThreshold) — that lives in axis/layout.
 */
export type FormatContext = {
  tickStep?: number
  locale?: string
}

const AUTO_DECIMALS_MIN = 0
const AUTO_DECIMALS_MAX = 6

const DEFAULT_COMPACT_MAX_FRACTION_DIGITS = 1

// --- formatRaw (lossless for tooltips; -0 → "0", no spurious exponent) ---

function trimTrailing(s: string): string {
  s = s.replace(/(\.\d*?)0+$/, '$1')
  s = s.replace(/\.$/, '')
  return s
}

/**
 * Lossless stringify for inspection. Normalize -0 → "0".
 * Use toPrecision(15) + trim for floats; never toString() alone for floats.
 * After trim, do not emit "1e+3" unless the input was already in that form (tooltips).
 */
export function formatRaw(value: number): string {
  if (value === 0 || Object.is(value, -0)) return '0'
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return String(value)

  const abs = Math.abs(value)
  if (Number.isInteger(value) && abs <= Number.MAX_SAFE_INTEGER) {
    return String(value)
  }

  let s = value.toPrecision(15)
  s = trimTrailing(s)
  // Don't emit "1e+3" for normal range; axes won't hit this path but tooltips might
  if (s.includes('e') && abs >= 1e-4 && abs < 1e6) {
    s = String(Number(s))
  }
  return s
}

/**
 * Format with fixed decimal places.
 */
export function formatDecimals(value: number, decimals: number): string {
  if (value === 0 || Object.is(value, -0)) return '0'
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return String(value)
  const n = Math.max(0, Math.floor(decimals))
  const s = value.toFixed(n)
  return trimTrailing(s)
}

// --- significant figures (moved from text/format) ---

const USE_EXPONENTIAL_ABOVE = 1e6
const USE_EXPONENTIAL_BELOW = 1e-4

export function formatSignificantFigures(
  value: number,
  sigFigs: number
): string {
  if (sigFigs < 1) {
    throw new RangeError(
      `formatSignificantFigures: sigFigs must be >= 1, got ${sigFigs}`
    )
  }
  const n = Math.max(1, Math.floor(sigFigs))

  if (value === 0 || Object.is(value, -0)) return '0'
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return String(value)

  const abs = Math.abs(value)
  const useExponential =
    abs >= USE_EXPONENTIAL_ABOVE || abs < USE_EXPONENTIAL_BELOW

  if (useExponential) {
    return trimTrailing(value.toExponential(n - 1))
  }
  const rounded = Number(value.toPrecision(n))
  return trimTrailing(String(rounded))
}

// --- compact (K/M/B); policy to use it lives in axis/layout ---

function compactFallback(value: number, maxFrac: number): string {
  if (value === 0 || Object.is(value, -0)) return '0'
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return String(value)
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12)
    return `${sign}${(abs / 1e12).toFixed(maxFrac).replace(/\.0+$/, '')}T`
  if (abs >= 1e9)
    return `${sign}${(abs / 1e9).toFixed(maxFrac).replace(/\.0+$/, '')}B`
  if (abs >= 1e6)
    return `${sign}${(abs / 1e6).toFixed(maxFrac).replace(/\.0+$/, '')}M`
  if (abs >= 1e3)
    return `${sign}${(abs / 1e3).toFixed(maxFrac).replace(/\.0+$/, '')}K`
  return `${sign}${trimTrailing(abs.toFixed(maxFrac))}`
}

/**
 * Format a number in compact notation (e.g. 140K, 1.3M). Uses Intl when locale is provided; fallback when Intl unavailable.
 */
export function formatCompact(
  value: number,
  locale?: string,
  maximumFractionDigits: number = DEFAULT_COMPACT_MAX_FRACTION_DIGITS
): string {
  if (locale !== undefined && locale !== '') {
    try {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits,
      }).format(value)
    } catch {
      // Intl unavailable or invalid locale
    }
  }
  return compactFallback(value, maximumFractionDigits)
}

// --- locale-aware formatting (grouping + decimal separator) ---

function formatWithLocale(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return String(value)
  }
}

// --- AUTO decimals from tick step (axis only) ---

function autoDecimalsFromStep(step: number): number {
  if (step === 0 || !Number.isFinite(step)) return 0
  if (step >= 1) return 0
  // Prefer exact representation (e.g. 0.25 → 2 decimals for "1.25")
  for (let d = 0; d <= AUTO_DECIMALS_MAX; d++) {
    const scaled = step * Math.pow(10, d)
    if (Math.abs(scaled - Math.round(scaled)) < 1e-10) {
      return Math.max(AUTO_DECIMALS_MIN, Math.min(AUTO_DECIMALS_MAX, d))
    }
  }
  const d = Math.ceil(-Math.log10(step))
  return Math.max(AUTO_DECIMALS_MIN, Math.min(AUTO_DECIMALS_MAX, d))
}

/**
 * Format a number. format === undefined means AUTO (use context.tickStep for decimals).
 * Callers do not synthesize a fake { mode: 'auto' }; pass undefined for AUTO.
 * Context is FormatContext only (tickStep, locale). No axis policy here.
 */
export function formatNumber(
  value: number,
  format: NumberFormat | undefined,
  context?: FormatContext
): string {
  const locale = context?.locale

  if (format === undefined) {
    const step = context?.tickStep ?? 0
    const decimals = autoDecimalsFromStep(step)
    if (locale !== undefined && locale !== '') {
      return formatWithLocale(value, locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    }
    return formatDecimals(value, decimals)
  }

  switch (format.mode) {
    case 'raw':
      if (locale !== undefined && locale !== '') {
        return formatWithLocale(value, locale, { maximumFractionDigits: 20 })
      }
      return formatRaw(value)
    case 'decimals': {
      const n = Math.max(0, Math.floor(format.decimals))
      if (locale !== undefined && locale !== '') {
        return formatWithLocale(value, locale, {
          minimumFractionDigits: n,
          maximumFractionDigits: n,
        })
      }
      return formatDecimals(value, format.decimals)
    }
    case 'significantFigures': {
      const n = Math.max(1, Math.floor(format.significantFigures))
      if (locale !== undefined && locale !== '') {
        return formatWithLocale(value, locale, {
          maximumSignificantDigits: n,
          minimumSignificantDigits: n,
        })
      }
      return formatSignificantFigures(value, format.significantFigures)
    }
    case 'compact':
      return formatCompact(
        value,
        format.locale ?? locale,
        format.maximumFractionDigits ?? DEFAULT_COMPACT_MAX_FRACTION_DIGITS
      )
    default:
      return formatRaw(value)
  }
}
