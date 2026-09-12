/**
 * Pure scene → SVG markup string (no `document`, no Chromium).
 *
 * String v1 covers plot nodes: GROUP / PATH / RECT / CIRCLE / TEXT / POINT
 * (POINT geometry realized via scales from scene.metadata.hover descriptors).
 *
 * Out of string v1: tooltip, hover listeners, legend overlay, and gradient paints
 * (solid fill/stroke only; gradients are skipped).
 */
import type { AnyPaint, SceneNode, SceneStyle } from '@owlplot/core'
import {
  SceneNodeKind,
  isHoverMetadata,
  createScaleFromDescriptor,
} from '@owlplot/core'
import { serializeSceneTransform } from '../shared/sceneTransform'
import {
  realizePointNode,
  type PointRenderContext,
  type HoverScales,
} from '../render/realizePoint'

export type SvgStringSize = { width: number; height: number }

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function attrs(parts: Array<string | false | null | undefined>): string {
  const joined = parts.filter(Boolean).join(' ')
  return joined ? ` ${joined}` : ''
}

function styleAttrs(style: SceneStyle | undefined): string {
  if (!style) return ''
  const parts: string[] = []
  for (const [key, val] of Object.entries(style)) {
    if (val == null) continue
    if (key === 'fontSizePx') {
      parts.push(`font-size="${escapeXml(String(val))}px"`)
      continue
    }
    if (key === 'fill' || key === 'stroke') {
      const paint = val as AnyPaint
      if (paint.type === 'solid') {
        parts.push(`${key}="${escapeXml(paint.color)}"`)
      }
      // Gradients skipped in string v1 (see file comment).
      continue
    }
    const attr = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    parts.push(`${attr}="${escapeXml(String(val))}"`)
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}

function buildPointContext(scene: SceneNode): PointRenderContext | undefined {
  const rawHover = scene.metadata?.hover
  if (!isHoverMetadata(rawHover)) return undefined
  const scalesDesc = rawHover.scales
  let scales: HoverScales
  if ('yLeft' in scalesDesc && 'yRight' in scalesDesc) {
    scales = {
      x: createScaleFromDescriptor(scalesDesc.x),
      yLeft: createScaleFromDescriptor(scalesDesc.yLeft),
      yRight: createScaleFromDescriptor(scalesDesc.yRight),
    }
  } else {
    const single = scalesDesc as {
      x: typeof scalesDesc.x
      y: typeof scalesDesc.x
    }
    scales = {
      x: createScaleFromDescriptor(single.x),
      y: createScaleFromDescriptor(single.y),
    }
  }
  const seriesYAxis = Object.fromEntries(
    rawHover.series.map(s => [s.id, s.yAxis])
  )
  return { scales, seriesYAxis }
}

function serializeNode(
  node: SceneNode,
  context: PointRenderContext | undefined
): string {
  const idAttr = `id="${escapeXml(node.id)}"`
  const style = styleAttrs(node.style)

  switch (node.kind) {
    case SceneNodeKind.GROUP: {
      const transform = serializeSceneTransform(node.transform)
      const transformAttr = transform
        ? `transform="${escapeXml(transform)}"`
        : undefined
      const children = node.children
        .map(child => serializeNode(child, context))
        .join('')
      return `<g${attrs([idAttr, transformAttr])}${style}>${children}</g>`
    }
    case SceneNodeKind.PATH: {
      return `<path${attrs([idAttr, `d="${escapeXml(node.d)}"`])}${style}/>`
    }
    case SceneNodeKind.RECT: {
      return `<rect${attrs([
        idAttr,
        `x="${node.x}"`,
        `y="${node.y}"`,
        `width="${node.width}"`,
        `height="${node.height}"`,
      ])}${style}/>`
    }
    case SceneNodeKind.CIRCLE: {
      return `<circle${attrs([
        idAttr,
        `cx="${node.cx}"`,
        `cy="${node.cy}"`,
        `r="${node.r}"`,
      ])}${style}/>`
    }
    case SceneNodeKind.POINT: {
      if (!context) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[owlplot] ScenePointNode requires render context with scales and seriesYAxis; skipping point.'
          )
        }
        return ''
      }
      const realized = realizePointNode(node, context)
      if (!realized) return ''
      if (realized.tag === 'circle') {
        return `<circle${attrs([
          idAttr,
          `cx="${realized.cx}"`,
          `cy="${realized.cy}"`,
          `r="${realized.r}"`,
        ])}${style}/>`
      }
      if (realized.tag === 'rect') {
        return `<rect${attrs([
          idAttr,
          `x="${realized.x}"`,
          `y="${realized.y}"`,
          `width="${realized.width}"`,
          `height="${realized.height}"`,
        ])}${style}/>`
      }
      if (realized.tag === 'path') {
        return `<path${attrs([
          idAttr,
          `d="${escapeXml(realized.d)}"`,
          `transform="${escapeXml(realized.transform)}"`,
        ])}${style}/>`
      }
      return `<text${attrs([
        idAttr,
        `x="${realized.x}"`,
        `y="${realized.y}"`,
        `text-anchor="${realized.textAnchor}"`,
        `dominant-baseline="${realized.dominantBaseline}"`,
        `font-size="${realized.fontSize}"`,
      ])}${style}>${escapeXml(realized.text)}</text>`
    }
    case SceneNodeKind.TEXT: {
      const transform = serializeSceneTransform(node.transform)
      return `<text${attrs([
        idAttr,
        `x="${node.x}"`,
        `y="${node.y}"`,
        node.textAnchor
          ? `text-anchor="${escapeXml(node.textAnchor)}"`
          : undefined,
        node.dominantBaseline
          ? `dominant-baseline="${escapeXml(node.dominantBaseline)}"`
          : undefined,
        transform ? `transform="${escapeXml(transform)}"` : undefined,
      ])}${style}>${escapeXml(node.text)}</text>`
    }
    default: {
      return ''
    }
  }
}

/**
 * Serialize a scene graph to SVG markup.
 * Pure string building — no DOM APIs.
 */
export function sceneToSvgString(
  scene: SceneNode,
  size: SvgStringSize
): string {
  const context = buildPointContext(scene)
  const body = serializeNode(scene, context)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}">${body}</svg>`
}
