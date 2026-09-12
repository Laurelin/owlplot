import type { SceneTransform } from '@owlplot/core'

function serializeSceneTransformValue(
  transform: SceneTransform
): string | undefined {
  if (transform.kind === 'translate') {
    return `translate(${transform.x},${transform.y})`
  }

  if (transform.kind === 'rotate') {
    if (transform.originX != null && transform.originY != null) {
      return `rotate(${transform.degrees} ${transform.originX} ${transform.originY})`
    }
    return `rotate(${transform.degrees})`
  }

  return undefined
}

/** Serialize scene transform(s) to an SVG transform attribute value. */
export function serializeSceneTransform(
  transform: SceneTransform | SceneTransform[] | undefined
): string | undefined {
  if (transform == null) return undefined
  const transforms = Array.isArray(transform) ? transform : [transform]
  const parts = transforms
    .map(serializeSceneTransformValue)
    .filter((value): value is string => value != null && value !== '')
  return parts.length > 0 ? parts.join(' ') : undefined
}
