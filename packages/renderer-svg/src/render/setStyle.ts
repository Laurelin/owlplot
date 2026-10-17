import type { AnyPaint, GradientPaint, SceneStyle } from '@owlplot/core'
import { SvgAttributeName } from '../shared/enums'
import { ensureGradientDef } from './gradientDefs'
import { assertNever } from '../shared/assertNever'

type StyleEffect =
  | { kind: 'attribute'; name: string; value: string }
  | { kind: 'gradient'; name: 'fill' | 'stroke'; paint: GradientPaint }

function toKebabCase(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase()
}

function resolvePaintEffect(
  name: 'fill' | 'stroke',
  paint: AnyPaint
): StyleEffect | null {
  switch (paint.type) {
    case 'solid':
      return { kind: 'attribute', name, value: paint.color }
    case 'linear':
    case 'radial':
      return { kind: 'gradient', name, paint }
    default:
      return assertNever(paint, 'resolvePaintEffect')
  }
}

function resolveStyleEffect(key: string, value: unknown): StyleEffect | null {
  if (value == null) return null
  if (key === 'fontSizePx') {
    return {
      kind: 'attribute',
      name: SvgAttributeName.FONT_SIZE,
      value: `${String(value)}px`,
    }
  }
  if (key === 'fill' || key === 'stroke') {
    return resolvePaintEffect(key, value as AnyPaint)
  }
  return {
    kind: 'attribute',
    name: toKebabCase(key),
    value: String(value),
  }
}

function applyStyleEffect(
  el: Element,
  effect: StyleEffect,
  svg?: SVGSVGElement
): void {
  if (effect.kind === 'attribute') {
    el.setAttribute(effect.name, effect.value)
    return
  }
  if (!svg) {
    throw new Error(
      'Gradient paint requires SVG element for defs, but svg was not provided'
    )
  }
  const url = ensureGradientDef(svg, effect.paint, {
    isStroke: effect.name === 'stroke',
  })
  el.setAttribute(effect.name, url)
}

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

  for (const [key, value] of Object.entries(style)) {
    const effect = resolveStyleEffect(key, value)
    if (effect) applyStyleEffect(el, effect, svg)
  }
}
