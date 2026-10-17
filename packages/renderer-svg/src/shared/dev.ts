/**
 * Single environment probe for the renderer package.
 *
 * The renderer runs in browsers and bundlers where a Node `process`
 * global may not exist, so no other module reads `process` directly.
 * This probe reads it through `globalThis` and tolerates its absence.
 */
function isProductionEnvironment(): boolean {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: { NODE_ENV?: string } }
  }
  return runtime.process?.env?.NODE_ENV === 'production'
}

/** Dev-only warning: silent in production, safe with no `process` global. */
export function warnDev(message: string): void {
  if (isProductionEnvironment()) return
  console.warn(message)
}
