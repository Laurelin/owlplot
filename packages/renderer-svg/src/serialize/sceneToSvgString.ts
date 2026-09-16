/**
 * Pure scene → SVG markup string (no `document`, no Chromium).
 *
 * String v1 covers plot nodes: GROUP / PATH / RECT / CIRCLE / TEXT / POINT
 * (POINT geometry realized via scales from scene.metadata.hover descriptors).
 *
 * Out of string v1: tooltip, hover listeners, legend overlay, and gradient paints
 * (solid fill/stroke only; gradients are skipped).
 */
import type {
  AnyPaint,
  SceneNode,
  ScenePointNode,
  SceneStyle,
} from '@owlplot/core'
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

function serializePaintStyle(
  key: 'fill' | 'stroke',
  paint: AnyPaint
): string | undefined {
  if (paint.type !== 'solid') return undefined
  return `${key}="${escapeXml(paint.color)}"`
}

function serializeStyleEntry(key: string, value: unknown): string | undefined {
  if (value == null) return undefined
  if (key === 'fontSizePx') {
    return `font-size="${escapeXml(String(value))}px"`
  }
  if (key === 'fill' || key === 'stroke') {
    return serializePaintStyle(key, value as AnyPaint)
  }
  const attr = key.replace(/([A-Z])/g, '-$1').toLowerCase()
  return `${attr}="${escapeXml(String(value))}"`
}

function styleAttrs(style: SceneStyle | undefined): string {
  if (!style) return ''
  const parts: string[] = []
  for (const [key, value] of Object.entries(style)) {
    const part = serializeStyleEntry(key, value)
    if (part) parts.push(part)
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

function serializeRealizedPoint(
  idAttr: string,
  style: string,
  realized: NonNullable<ReturnType<typeof realizePointNode>>
): string {
  switch (realized.tag) {
    case 'circle':
      return `<circle${attrs([
        idAttr,
        `cx="${realized.cx}"`,
        `cy="${realized.cy}"`,
        `r="${realized.r}"`,
      ])}${style}/>`
    case 'rect':
      return `<rect${attrs([
        idAttr,
        `x="${realized.x}"`,
        `y="${realized.y}"`,
        `width="${realized.width}"`,
        `height="${realized.height}"`,
      ])}${style}/>`
    case 'path':
      return `<path${attrs([
        idAttr,
        `d="${escapeXml(realized.d)}"`,
        `transform="${escapeXml(realized.transform)}"`,
      ])}${style}/>`
    case 'text':
      return `<text${attrs([
        idAttr,
        `x="${realized.x}"`,
        `y="${realized.y}"`,
        `text-anchor="${realized.textAnchor}"`,
        `dominant-baseline="${realized.dominantBaseline}"`,
        `font-size="${realized.fontSize}"`,
      ])}${style}>${escapeXml(realized.text)}</text>`
  }
}

function serializePointNode(
  node: ScenePointNode,
  context: PointRenderContext | undefined
): string {
  const idAttr = `id="${escapeXml(node.id)}"`
  const style = styleAttrs(node.style)
  if (!context) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[owlplot] ScenePointNode requires render context with scales and seriesYAxis; skipping point.'
      )
    }
    return ''
  }
  const realized = realizePointNode(node, context)
  return realized ? serializeRealizedPoint(idAttr, style, realized) : ''
}

function serializeGroupNode(
  node: Extract<SceneNode, { kind: 'group' }>,
  context: PointRenderContext | undefined,
  idAttr: string,
  style: string
): string {
  const transform = serializeSceneTransform(node.transform)
  const transformAttr = transform
    ? `transform="${escapeXml(transform)}"`
    : undefined
  const children = node.children
    .map(child => serializeNode(child, context))
    .join('')
  return `<g${attrs([idAttr, transformAttr])}${style}>${children}</g>`
}

function serializeTextNode(
  node: Extract<SceneNode, { kind: 'text' }>,
  idAttr: string,
  style: string
): string {
  const transform = serializeSceneTransform(node.transform)
  return `<text${attrs([
    idAttr,
    `x="${node.x}"`,
    `y="${node.y}"`,
    node.textAnchor ? `text-anchor="${escapeXml(node.textAnchor)}"` : undefined,
    node.dominantBaseline
      ? `dominant-baseline="${escapeXml(node.dominantBaseline)}"`
      : undefined,
    transform ? `transform="${escapeXml(transform)}"` : undefined,
  ])}${style}>${escapeXml(node.text)}</text>`
}

function serializeShapeNode(
  node: SceneNode,
  idAttr: string,
  style: string
): string {
  switch (node.kind) {
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
    default:
      return ''
  }
}

function serializeStandardNode(
  node: SceneNode,
  context: PointRenderContext | undefined
): string {
  const idAttr = `id="${escapeXml(node.id)}"`
  const style = styleAttrs(node.style)
  if (node.kind === SceneNodeKind.GROUP) {
    return serializeGroupNode(node, context, idAttr, style)
  }
  if (node.kind === SceneNodeKind.TEXT) {
    return serializeTextNode(node, idAttr, style)
  }
  return serializeShapeNode(node, idAttr, style)
}

function serializeNode(
  node: SceneNode,
  context: PointRenderContext | undefined
): string {
  return node.kind === SceneNodeKind.POINT
    ? serializePointNode(node, context)
    : serializeStandardNode(node, context)
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
