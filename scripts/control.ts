/**
 * owlplot control CLI. Run after `npm run build`:
 *   npm run control -- render [outDir]
 *
 * render: writes one SVG per fixture variant to
 * <outDir>/<kind>/<variant>.svg (default artifacts/control/render).
 *
 * Errors set process.exitCode (no process.exit) so the run-ts runner
 * still removes its temp bundle dir.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { ChartConfig } from '@owlplot/core'
import { chartKindFixtures } from '../fixtures/chartKinds'
import { renderFixtureSvg } from './control/render'

function main(argv: readonly string[]): void {
  const [command, outArg] = argv
  if (command !== 'render') {
    console.error('usage: npm run control -- render [outDir]')
    process.exitCode = 2
    return
  }
  const outDir = resolve(outArg ?? 'artifacts/control/render')
  for (const [kind, { variants }] of Object.entries(chartKindFixtures)) {
    for (const variant of variants) {
      const svg = tryRender(kind, variant)
      if (svg === undefined || !tryWrite(join(outDir, kind), variant.id, svg)) {
        process.exitCode = 1
        return
      }
    }
  }
}

function tryRender(
  kind: string,
  variant: { id: string; config: ChartConfig }
): string | undefined {
  try {
    return renderFixtureSvg(variant.config)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`error: render failed for ${kind}/${variant.id}: ${msg}`)
    return undefined
  }
}

function tryWrite(dir: string, id: string, svg: string): boolean {
  try {
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `${id}.svg`)
    writeFileSync(file, svg)
    console.log(`wrote ${file}`)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? String(error)
    console.error(`error: cannot write ${dir} (${code})`)
    return false
  }
}

main(process.argv.slice(2))
