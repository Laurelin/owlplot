/**
 * Number formatting: raw (inspection), decimals, significant figures.
 * format === undefined means AUTO (axis tick step–based decimals only).
 * No heuristics outside this file.
 */

export type NumberFormat =
  | { mode: 'raw' }
  | { mode: 'decimals'; decimals: number }
  | { mode: 'significantFigures'; significantFigures: number }

const AUTO_DECIMALS_MIN = 0
const AUTO_DECIMALS_MAX = 6

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
 */
export function formatNumber(
  value: number,
  format: NumberFormat | undefined,
  context?: { tickStep?: number }
): string {
  if (format === undefined) {
    const step = context?.tickStep ?? 0
    const decimals = autoDecimalsFromStep(step)
    return formatDecimals(value, decimals)
  }
  switch (format.mode) {
    case 'raw':
      return formatRaw(value)
    case 'decimals':
      return formatDecimals(value, format.decimals)
    case 'significantFigures':
      return formatSignificantFigures(value, format.significantFigures)
    default:
      return formatRaw(value)
  }
}
