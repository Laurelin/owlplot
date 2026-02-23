import { SceneNodeKind, type SceneNode, type ScenePathNode } from '@owlplot/core'
import type { SceneTransform } from '../shared/sceneTransforms'

type PlotRect = { x: number; y: number; width: number; height: number }

type WedgeConfig = {
  readonly id: string
  readonly color: string
  readonly lowerFraction: number
  readonly upperFraction: number
}

const BIG_O_WEDGE_ID_PREFIX = 'bigO:wedge:'

const CONCEPTUAL_SLOPES: readonly number[] = [0.15, 0.3, 0.5, 0.75, 0.92] as const
const WEDGE_COLORS: readonly string[] = [
  '#7bdc2a',
  '#c8ea2d',
  '#fff15c',
  '#ffc447',
  '#f19a8f',
  '#ef8f87',
] as const

function isFiniteRect(value: unknown): value is PlotRect {
  if (typeof value !== 'object' || value == null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.width) &&
    Number.isFinite(candidate.height)
  )
}

function getPlotRectFromHoverMetadata(scene: SceneNode): PlotRect | null {
  const metadata = scene.metadata as Record<string, unknown> | undefined
  const hover = metadata?.hover
  if (typeof hover !== 'object' || hover == null) return null
  const maybeRect = (hover as Record<string, unknown>).plotRect
  return isFiniteRect(maybeRect) ? maybeRect : null
}

function getPlotRectFromBackgroundRect(scene: SceneNode): PlotRect | null {
  if (scene.kind !== SceneNodeKind.GROUP) return null

  const preferred = scene.children.find(
    child => child.kind === SceneNodeKind.RECT && child.id === 'background'
  )
  if (preferred?.kind === SceneNodeKind.RECT) {
    return preferred
  }

  const fallback = scene.children.find(
    child =>
      child.kind === SceneNodeKind.RECT &&
      (child.metadata as { role?: unknown } | undefined)?.role === 'background'
  )
  if (fallback?.kind === SceneNodeKind.RECT) {
    return fallback
  }

  return null
}

function resolvePlotRect(scene: SceneNode): PlotRect {
  return (
    getPlotRectFromHoverMetadata(scene) ??
    getPlotRectFromBackgroundRect(scene) ??
    (() => {
      throw new Error(
        'Big-O wedge transform could not resolve plot bounds (hover.plotRect/background rect missing).'
      )
    })()
  )
}

function clampFraction(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function wedgePath(
  plotRect: PlotRect,
  lowerFraction: number,
  upperFraction: number
): string {
  const left = plotRect.x
  const right = plotRect.x + plotRect.width
  const bottom = plotRect.y + plotRect.height

  const lower = clampFraction(Math.min(lowerFraction, upperFraction))
  const upper = clampFraction(Math.max(lowerFraction, upperFraction))

  const lowerY = bottom - lower * plotRect.height
  const upperY = bottom - upper * plotRect.height

  return `M ${left} ${bottom} L ${right} ${lowerY} L ${right} ${upperY} Z`
}

function buildWedges(plotRect: PlotRect): ScenePathNode[] {
  const boundaries = [0, ...CONCEPTUAL_SLOPES.map(clampFraction), 1]
  const wedges: WedgeConfig[] = []

  for (let i = 0; i < WEDGE_COLORS.length; i += 1) {
    const lower = boundaries[i]
    const upper = boundaries[i + 1]
    if (lower == null || upper == null) break
    if (upper <= lower) continue

    wedges.push({
      id: String(i),
      color: WEDGE_COLORS[i]!,
      lowerFraction: lower,
      upperFraction: upper,
    })
  }

  return wedges.map(wedge => ({
    kind: SceneNodeKind.PATH,
    id: `${BIG_O_WEDGE_ID_PREFIX}${wedge.id}`,
    d: wedgePath(plotRect, wedge.lowerFraction, wedge.upperFraction),
    style: {
      fill: { type: 'solid', color: wedge.color },
      opacity: 0.62,
      stroke: { type: 'solid', color: 'none' },
    },
    metadata: { role: 'background' },
  }))
}

function stripExistingWedges(children: readonly SceneNode[]): SceneNode[] {
  return children.filter(child => !child.id.startsWith(BIG_O_WEDGE_ID_PREFIX))
}

function findBackgroundInsertIndex(children: readonly SceneNode[]): number {
  const preferredIndex = children.findIndex(
    child => child.kind === SceneNodeKind.RECT && child.id === 'background'
  )
  if (preferredIndex !== -1) return preferredIndex + 1

  const fallbackIndex = children.findIndex(
    child =>
      child.kind === SceneNodeKind.RECT &&
      (child.metadata as { role?: unknown } | undefined)?.role === 'background'
  )
  if (fallbackIndex !== -1) return fallbackIndex + 1

  return 0
}

export const injectBigOWedgeBackgroundTransform: SceneTransform = scene => {
  if (scene.kind !== SceneNodeKind.GROUP) return scene
  if (scene.children.some(child => child.id.startsWith(BIG_O_WEDGE_ID_PREFIX))) {
    return scene
  }

  const plotRect = resolvePlotRect(scene)
  const childrenWithoutWedges = stripExistingWedges(scene.children)
  const insertAt = findBackgroundInsertIndex(childrenWithoutWedges)
  const wedges = buildWedges(plotRect)
  const nextChildren = [
    ...childrenWithoutWedges.slice(0, insertAt),
    ...wedges,
    ...childrenWithoutWedges.slice(insertAt),
  ]

  return { ...scene, children: nextChildren }
}

export const styleBigOPosterTransform: SceneTransform = scene => {
  if (scene.kind !== SceneNodeKind.GROUP) return scene

  let changed = false
  const nextChildren = scene.children.map(child => {
    if (child.kind !== SceneNodeKind.PATH || !child.id.startsWith('series:')) {
      return child
    }

    changed = true
    return {
      ...child,
      style: {
        ...child.style,
        stroke: { type: 'solid', color: '#111111' },
        strokeWidth: 1.8,
        opacity: 0.95,
      },
    } satisfies ScenePathNode
  })

  return changed ? { ...scene, children: nextChildren } : scene
}
