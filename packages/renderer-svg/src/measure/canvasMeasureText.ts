/**
 * Canvas-backed MeasureText for browser / jsdom environments.
 *
 * Lives outside @owlplot/core so core never depends on DOM measurement APIs
 * (getBBox / getComputedTextLength / getComputedStyle / canvas).
 *
 * Core still receives measureText via ChartEnvironment injection.
 */
import type { MeasureText, TextMetrics } from '@owlplot/core'

function parseFontSizePx(fontCss: string): number {
  const match = /(\d+(?:\.\d+)?)(px|pt)/i.exec(fontCss)
  if (!match) return 12
  const size = Number(match[1])
  const unit = (match[2] ?? 'px').toLowerCase()
  return unit === 'pt' ? size * (4 / 3) : size
}

/**
 * jsdom without the optional native `canvas` package logs
 * "Not implemented: HTMLCanvasElement.prototype.getContext" via console.error.
 * Probe once with that noise suppressed; real browsers never hit this path.
 */
function tryGet2dContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null {
  const prevError = console.error
  console.error = (...args: unknown[]) => {
    const first = args[0]
    if (
      typeof first === 'string' &&
      first.includes('HTMLCanvasElement.prototype.getContext')
    ) {
      return
    }
    if (
      first instanceof Error &&
      typeof first.message === 'string' &&
      first.message.includes('HTMLCanvasElement.prototype.getContext')
    ) {
      return
    }
    prevError.apply(console, args as Parameters<typeof console.error>)
  }
  try {
    return canvas.getContext('2d')
  } catch {
    return null
  } finally {
    console.error = prevError
  }
}

/**
 * Create a MeasureText that uses an offscreen canvas 2d context.
 *
 * When canvas context is unavailable (common in bare jsdom without the
 * optional `canvas` native package), returns finite metrics with width 0
 * and height derived from the font size so layout still runs.
 */
export function createCanvasMeasureText(
  doc: Document | undefined = typeof document !== 'undefined'
    ? document
    : undefined
): MeasureText {
  let ctx: CanvasRenderingContext2D | null | undefined

  const ensureContext = (): CanvasRenderingContext2D | null => {
    if (ctx !== undefined) return ctx
    if (!doc || typeof doc.createElement !== 'function') {
      ctx = null
      return ctx
    }
    try {
      const canvas = doc.createElement('canvas')
      ctx = tryGet2dContext(canvas)
    } catch {
      ctx = null
    }
    return ctx
  }

  return (text: string, fontCss: string): TextMetrics => {
    const height = parseFontSizePx(fontCss)
    const context = ensureContext()
    if (!context) {
      return { width: 0, height }
    }
    context.font = fontCss
    const width = context.measureText(text).width
    return {
      width: Number.isFinite(width) ? width : 0,
      height,
    }
  }
}

let defaultMeasurer: MeasureText | undefined

/** Default canvas MeasureText bound to the ambient document (browser / jsdom). */
export const canvasMeasureText: MeasureText = (text, fontCss) => {
  if (!defaultMeasurer) {
    defaultMeasurer = createCanvasMeasureText()
  }
  return defaultMeasurer(text, fontCss)
}
