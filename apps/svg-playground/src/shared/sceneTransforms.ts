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
