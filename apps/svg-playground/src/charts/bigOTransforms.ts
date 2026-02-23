import { SceneNodeKind, type SceneNode, type ScenePathNode } from '@owlplot/core'
import type { SceneTransform } from '../shared/sceneTransforms'

type PlotRect = { x: number; y: number; width: number; height: number }

const WEDGE_ID_PREFIX = 'bigO:wedge:'
const BOUNDARIES: readonly number[] = [0, 0.12, 0.28, 0.5, 0.76, 1] as const
const COLORS: readonly string[] = [
  '#19cc2a',
  '#b9e11d',
  '#f6ef13',
  '#ffc107',
  '#ef8f87',
] as const

function resolvePlotRect(scene: SceneNode): PlotRect {
  const hover = (scene.metadata as Record<string, unknown> | undefined)?.hover
  const plotRect = (hover as { plotRect?: PlotRect } | undefined)?.plotRect
  if (plotRect != null) return plotRect

  if (scene.kind === SceneNodeKind.GROUP) {
    const background = scene.children.find(
      child =>
        child.kind === SceneNodeKind.RECT &&
        ((child.metadata as { role?: unknown } | undefined)?.role ===
          'background' ||
          child.id === 'background')
    )
    if (background?.kind === SceneNodeKind.RECT) return background
  }

  throw new Error('Big-O wedge transform requires plotRect metadata.')
}

function makeWedgePath(
  rect: PlotRect,
  lowerFraction: number,
  upperFraction: number
): string {
  const left = rect.x
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  const lowerY = bottom - lowerFraction * rect.height
  const upperY = bottom - upperFraction * rect.height
  return `M ${left} ${bottom} L ${right} ${lowerY} L ${right} ${upperY} Z`
}

export const injectBigOWedgeBackgroundTransform: SceneTransform = scene => {
  if (scene.kind !== SceneNodeKind.GROUP) return scene
  if (scene.children.some(child => child.id.startsWith(WEDGE_ID_PREFIX))) {
    return scene
  }

  const rect = resolvePlotRect(scene)
  const wedges: ScenePathNode[] = COLORS.map((color, index) => ({
    kind: SceneNodeKind.PATH,
    id: `${WEDGE_ID_PREFIX}${index}`,
    d: makeWedgePath(rect, BOUNDARIES[index]!, BOUNDARIES[index + 1]!),
    style: {
      fill: { type: 'solid', color },
      opacity: 0.82,
      stroke: { type: 'solid', color: 'none' },
    },
    metadata: { role: 'background' },
  }))

  const backgroundIndex = scene.children.findIndex(
    child =>
      child.kind === SceneNodeKind.RECT &&
      ((child.metadata as { role?: unknown } | undefined)?.role ===
        'background' ||
        child.id === 'background')
  )
  const insertIndex = backgroundIndex === -1 ? 0 : backgroundIndex + 1
  return {
    ...scene,
    children: [
      ...scene.children.slice(0, insertIndex),
      ...wedges,
      ...scene.children.slice(insertIndex),
    ],
  }
}

export const styleBigOPosterTransform: SceneTransform = scene => {
  if (scene.kind !== SceneNodeKind.GROUP) return scene
  let changed = false
  const children = scene.children.map(child => {
    if (child.kind !== SceneNodeKind.PATH || !child.id.startsWith('series:')) {
      return child
    }
    changed = true
    return {
      ...child,
      style: {
        ...child.style,
        stroke: { type: 'solid', color: '#111111' },
        strokeWidth: 1.6,
        opacity: 0.96,
      },
    } satisfies ScenePathNode
  })
  return changed ? { ...scene, children } : scene
}

