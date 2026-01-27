import type { AnyPaint, SceneStyle } from '@owlplot/core'
import { SvgAttributeName } from '../shared/enums'
import { ensureGradientDef } from './gradientDefs'

/**
 * Sets style on an SVG element, handling AnyPaint for fill and stroke.
 * Greenfield strictness: AnyPaint ONLY - no string handling.
 */
export function setStyle(
  el: Element,
  style: SceneStyle | undefined,
  svg?: SVGSVGElement
) {
  if (!style) return

  for (const [key, val] of Object.entries(style)) {
    if (val == null) continue

    // Special handling for fontSizePx: convert to font-size with "px" unit
    if (key === 'fontSizePx') {
      el.setAttribute(SvgAttributeName.FONT_SIZE, `${val}px`)
      continue
    }

    // Handle fill and stroke as AnyPaint
    if (key === 'fill' || key === 'stroke') {
      const paint = val as AnyPaint
      if (paint.type === 'solid') {
        el.setAttribute(key, paint.color)
      } else if (paint.type === 'linear' || paint.type === 'radial') {
        // Gradient paint requires SVG element for defs
        if (!svg) {
          throw new Error(
            `Gradient paint requires SVG element for defs, but svg was not provided`
          )
        }
        // Pass isStroke flag so stroke gradients use userSpaceOnUse to follow the path
        const url = ensureGradientDef(svg, paint, { isStroke: key === 'stroke' })
        el.setAttribute(key, url)
      }
      continue
    }

    // Other style properties (strokeWidth, opacity, etc.)
    const attr = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    el.setAttribute(attr, String(val))
  }
}
