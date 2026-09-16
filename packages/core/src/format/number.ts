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

function formatNonFiniteOrZero(value: number): string | undefined {
  if (value === 0) return '0'
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return String(value)
  return undefined
}

function isPlainInteger(value: number): boolean {
  return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
}

function shouldExpandExponential(value: number, formatted: string): boolean {
  const abs = Math.abs(value)
  return formatted.includes('e') && abs >= 1e-4 && abs < 1e6
}

/**
 * Lossless stringify for inspection. Normalize -0 → "0".
 * Use toPrecision(15) + trim for floats; never toString() alone for floats.
 * After trim, do not emit "1e+3" unless the input was already in that form (tooltips).
 */
export function formatRaw(value: number): string {
  const special = formatNonFiniteOrZero(value)
  if (special !== undefined) return special
  if (isPlainInteger(value)) return String(value)

  const formatted = trimTrailing(value.toPrecision(15))
  return shouldExpandExponential(value, formatted)
    ? String(Number(formatted))
    : formatted
}

/**
 * Format with fixed decimal places.
 */
export function formatDecimals(value: number, decimals: number): string {
  const special = formatNonFiniteOrZero(value)
  if (special !== undefined) return special
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

  const special = formatNonFiniteOrZero(value)
  if (special !== undefined) return special

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

type CompactMagnitude = { threshold: number; suffix: string }

const COMPACT_MAGNITUDES: readonly CompactMagnitude[] = [
  { threshold: 1e12, suffix: 'T' },
  { threshold: 1e9, suffix: 'B' },
  { threshold: 1e6, suffix: 'M' },
  { threshold: 1e3, suffix: 'K' },
]

function findCompactMagnitude(abs: number): CompactMagnitude | undefined {
  return COMPACT_MAGNITUDES.find(({ threshold }) => abs >= threshold)
}

function formatCompactAbsolute(abs: number, maxFrac: number): string {
  const magnitude = findCompactMagnitude(abs)
  if (magnitude === undefined) return trimTrailing(abs.toFixed(maxFrac))
  const scaled = (abs / magnitude.threshold)
    .toFixed(maxFrac)
    .replace(/\.0+$/, '')
  return `${scaled}${magnitude.suffix}`
}

function compactFallback(value: number, maxFrac: number): string {
  const special = formatNonFiniteOrZero(value)
  if (special !== undefined) return special
  const sign = value < 0 ? '-' : ''
  return `${sign}${formatCompactAbsolute(Math.abs(value), maxFrac)}`
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

function hasLocale(locale: string | undefined): locale is string {
  return locale !== undefined && locale !== ''
}

// --- AUTO decimals from tick step (axis only) ---

function usesIntegerDecimals(step: number): boolean {
  return step === 0 || !Number.isFinite(step) || step >= 1
}

function findExactDecimals(step: number): number | undefined {
  for (let d = 0; d <= AUTO_DECIMALS_MAX; d++) {
    const scaled = step * Math.pow(10, d)
    if (Math.abs(scaled - Math.round(scaled)) < 1e-10) {
      return Math.max(AUTO_DECIMALS_MIN, Math.min(AUTO_DECIMALS_MAX, d))
    }
  }
  return undefined
}

function autoDecimalsFromStep(step: number): number {
  if (usesIntegerDecimals(step)) return 0
  // Prefer exact representation (e.g. 0.25 → 2 decimals for "1.25")
  const exactDecimals = findExactDecimals(step)
  if (exactDecimals !== undefined) return exactDecimals
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
  if (format === undefined) return formatAuto(value, context?.tickStep, locale)
  return formatExplicit(value, format, locale)
}

function formatExplicit(
  value: number,
  format: NumberFormat,
  locale: string | undefined
): string {
  if (format.mode === 'raw') return formatRawMode(value, locale)
  if (format.mode === 'decimals') {
    return formatDecimalsMode(value, format.decimals, locale)
  }
  return formatSignificantOrCompact(value, format, locale)
}

function formatSignificantOrCompact(
  value: number,
  format: Extract<
    NumberFormat,
    { mode: 'significantFigures' } | { mode: 'compact' }
  >,
  locale: string | undefined
): string {
  if (format.mode === 'significantFigures') {
    return formatSignificantFiguresMode(
      value,
      format.significantFigures,
      locale
    )
  }
  if (format.mode === 'compact') return formatCompactMode(value, format, locale)
  return formatRaw(value)
}

function formatCompactMode(
  value: number,
  format: Extract<NumberFormat, { mode: 'compact' }>,
  locale: string | undefined
): string {
  const resolvedLocale = format.locale ?? locale
  const maxFractionDigits =
    format.maximumFractionDigits ?? DEFAULT_COMPACT_MAX_FRACTION_DIGITS
  return formatCompact(value, resolvedLocale, maxFractionDigits)
}

function formatAuto(
  value: number,
  tickStep: number | undefined,
  locale: string | undefined
): string {
  const decimals = autoDecimalsFromStep(tickStep ?? 0)
  if (!hasLocale(locale)) return formatDecimals(value, decimals)
  return formatWithLocale(value, locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatRawMode(value: number, locale: string | undefined): string {
  if (!hasLocale(locale)) return formatRaw(value)
  return formatWithLocale(value, locale, { maximumFractionDigits: 20 })
}

function formatDecimalsMode(
  value: number,
  decimals: number,
  locale: string | undefined
): string {
  if (!hasLocale(locale)) return formatDecimals(value, decimals)
  const normalized = Math.max(0, Math.floor(decimals))
  return formatWithLocale(value, locale, {
    minimumFractionDigits: normalized,
    maximumFractionDigits: normalized,
  })
}

function formatSignificantFiguresMode(
  value: number,
  significantFigures: number,
  locale: string | undefined
): string {
  if (!hasLocale(locale)) {
    return formatSignificantFigures(value, significantFigures)
  }
  const normalized = Math.max(1, Math.floor(significantFigures))
  return formatWithLocale(value, locale, {
    maximumSignificantDigits: normalized,
    minimumSignificantDigits: normalized,
  })
}
