/**
 * Pure scene → SVG markup string (no `document`, no Chromium).
 *
 * String v1 covers plot nodes: GROUP / PATH / RECT / CIRCLE / TEXT / POINT
 * (POINT geometry realized via scales from scene.metadata.hover descriptors).
 *
 * Out of string v1: tooltip, hover listeners, and legend overlay.
 * Gradient paints are written as <defs> plus a `url(#…)` fill/stroke.
 */
import type {
  AnyPaint,
  GradientPaint,
  SceneCircleNode,
  ScenePathNode,
  SceneRectNode,
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
import { warnDev } from '../shared/dev'
import { assertNever } from '../shared/assertNever'
import { DATA_POINT_INDEX, DATA_SERIES_ID } from '../shared/dataAttributes'
import {
  gradientDefData,
  gradientPaintUrl,
  type GradientDefData,
} from '../render/gradientDefs'
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

function serializePaintStyle(key: 'fill' | 'stroke', paint: AnyPaint): string {
  switch (paint.type) {
    case 'solid':
      return `${key}="${escapeXml(paint.color)}"`
    case 'linear':
    case 'radial':
      return `${key}="${gradientPaintUrl(paint, { isStroke: key === 'stroke' })}"`
    default:
      return assertNever(paint, 'serializePaintStyle')
  }
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
    default:
      return assertNever(realized, 'serializeRealizedPoint')
  }
}

function serializePointNode(
  node: ScenePointNode,
  context: PointRenderContext | undefined
): string {
  const idAttr = `id="${escapeXml(node.id)}"`
  const style = styleAttrs(node.style)
  if (!context) {
    warnDev(
      '[owlplot] ScenePointNode requires render context with scales and seriesYAxis; skipping point.'
    )
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

function serializePathNode(
  node: ScenePathNode,
  idAttr: string,
  style: string
): string {
  const seriesAttr = node.seriesId
    ? `${DATA_SERIES_ID}="${escapeXml(node.seriesId)}"`
    : undefined
  return `<path${attrs([idAttr, seriesAttr, `d="${escapeXml(node.d)}"`])}${style}/>`
}

function serializeRectNode(
  node: SceneRectNode,
  idAttr: string,
  style: string
): string {
  // Rect identity is both-or-neither, so datumIndex is set with seriesId.
  const identityAttrs =
    node.seriesId != null
      ? [
          `${DATA_SERIES_ID}="${escapeXml(node.seriesId)}"`,
          `${DATA_POINT_INDEX}="${node.datumIndex}"`,
        ]
      : []
  return `<rect${attrs([
    idAttr,
    ...identityAttrs,
    `x="${node.x}"`,
    `y="${node.y}"`,
    `width="${node.width}"`,
    `height="${node.height}"`,
  ])}${style}/>`
}

function serializeCircleNode(
  node: SceneCircleNode,
  idAttr: string,
  style: string
): string {
  return `<circle${attrs([
    idAttr,
    `cx="${node.cx}"`,
    `cy="${node.cy}"`,
    `r="${node.r}"`,
  ])}${style}/>`
}

function serializeGradientDefs(scene: SceneNode, size: SvgStringSize): string {
  const defs = new Map<string, GradientDefData>()
  const visitPaint = (paint: AnyPaint | undefined, isStroke: boolean) => {
    if (!paint || paint.type === 'solid') return
    const data = gradientDefData(paint as GradientPaint, {
      isStroke,
      width: size.width,
      height: size.height,
    })
    defs.set(data.id, data)
  }
  const visit = (node: SceneNode): void => {
    visitPaint(node.style?.fill, false)
    visitPaint(node.style?.stroke, true)
    if (node.kind === SceneNodeKind.GROUP) node.children.forEach(visit)
  }
  visit(scene)
  if (defs.size === 0) return ''
  const markup = [...defs.values()]
    .map(data => {
      const coordinates = Object.entries(data.coordinates)
        .map(([name, value]) => `${name}="${escapeXml(value)}"`)
        .join(' ')
      const stops = data.stops
        .map(
          stop =>
            `<stop offset="${escapeXml(stop.offset)}" stop-color="${escapeXml(stop.color)}"/>`
        )
        .join('')
      return `<${data.tag} id="${escapeXml(data.id)}" gradientUnits="${data.gradientUnits}" ${coordinates}>${stops}</${data.tag}>`
    })
    .join('')
  return `<defs>${markup}</defs>`
}

function serializeStandardNode(
  node: Exclude<SceneNode, ScenePointNode>,
  context: PointRenderContext | undefined
): string {
  const idAttr = `id="${escapeXml(node.id)}"`
  const style = styleAttrs(node.style)
  switch (node.kind) {
    case SceneNodeKind.GROUP:
      return serializeGroupNode(node, context, idAttr, style)
    case SceneNodeKind.TEXT:
      return serializeTextNode(node, idAttr, style)
    case SceneNodeKind.PATH:
      return serializePathNode(node, idAttr, style)
    case SceneNodeKind.RECT:
      return serializeRectNode(node, idAttr, style)
    case SceneNodeKind.CIRCLE:
      return serializeCircleNode(node, idAttr, style)
    default:
      return assertNever(node, 'serializeNode')
  }
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
  const defs = serializeGradientDefs(scene, size)
  const body = serializeNode(scene, context)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}">${defs}${body}</svg>`
}
