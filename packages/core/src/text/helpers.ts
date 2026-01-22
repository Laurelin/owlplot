import { MeasureText } from './types'

// used in node tests + as fallback in non-dom envs
export const approximateMeasureText: MeasureText = (text, fontCss) => {
  // crude but deterministic: ~0.6em per char, 1em height
  const fontSizeMatch = /(\d+(?:\.\d+)?)px/.exec(fontCss)
  const fontSizePx = fontSizeMatch ? Number(fontSizeMatch[1]) : 12
  return { width: text.length * fontSizePx * 0.6, height: fontSizePx }
}

/**
 * wrap measureText to choose between
 * configured font or fallback
 */
export function measureTextFont(
  measureText: MeasureText,
  text: string,
  font: string | undefined,
  fallbackFont: string
): { width: number; height: number } {
  return measureText(text, font ?? fallbackFont)
}

export function measure(
  measureText: MeasureText,
  text: string,
  font: string | undefined,
  fallbackFont: string
) {
  // use specified font if provided, else fallback
  return measureText(text, font ?? fallbackFont)
}
