import type { SceneStyle } from '@owlplot/core'
import { SvgAttributeName } from '../shared/enums'

export function setStyle(el: Element, style: SceneStyle | undefined) {
  if (!style) return

  for (const [key, val] of Object.entries(style)) {
    if (val == null) continue

    // Special handling for fontSizePx: convert to font-size with "px" unit
    if (key === 'fontSizePx') {
      el.setAttribute(SvgAttributeName.FONT_SIZE, `${val}px`)
      continue
    }

    const attr = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    el.setAttribute(attr, String(val))
  }
}
