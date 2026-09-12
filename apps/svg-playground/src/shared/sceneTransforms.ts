import { SceneNodeKind, type SceneNode } from '@owlplot/core'

export type SceneTransform = (scene: SceneNode) => SceneNode

export function applySceneTransforms(
  scene: SceneNode,
  transforms?: readonly SceneTransform[]
): SceneNode {
  if (transforms == null || transforms.length === 0) return scene

  return transforms.reduce((currentScene, transform) => {
    const nextScene = transform(currentScene)

    if (
      process.env.NODE_ENV !== 'production' &&
      nextScene.kind !== SceneNodeKind.GROUP
    ) {
      throw new Error('SceneTransform must return a GROUP root node')
    }

    return nextScene
  }, scene)
}

/** True when a scene node belongs to the given series id (path, fill, or point). */
export function nodeBelongsToSeries(node: SceneNode, seriesId: string): boolean {
  if (node.id === `series:${seriesId}` || node.id === `series-fill:${seriesId}`) {
    return true
  }
  if (node.id.startsWith(`point:${seriesId}:`)) return true
  if (node.kind === SceneNodeKind.POINT && node.seriesId === seriesId) return true
  return false
}

/**
 * Pure scene → scene: drop nodes for one series id.
 * Does not close over SVG, Symbols, or DOM.
 */
export function dropSeriesNodes(seriesId: string): SceneTransform {
  const walk = (node: SceneNode): SceneNode | null => {
    if (nodeBelongsToSeries(node, seriesId)) return null
    if (node.kind !== SceneNodeKind.GROUP) return node
    return {
      ...node,
      children: node.children
        .map(walk)
        .filter((child): child is SceneNode => child != null),
    }
  }

  return (scene: SceneNode): SceneNode => {
    const next = walk(scene)
    // Root must stay a GROUP; never drop the root itself.
    if (next == null || next.kind !== SceneNodeKind.GROUP) return scene
    return next
  }
}
