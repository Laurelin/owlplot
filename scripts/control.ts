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
    const dir = join(outDir, kind)
    try {
      mkdirSync(dir, { recursive: true })
      for (const variant of variants) {
        const file = join(dir, `${variant.id}.svg`)
        writeFileSync(file, renderFixtureSvg(variant.config))
        console.log(`wrote ${file}`)
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? String(error)
      console.error(`error: cannot write ${dir} (${code})`)
      process.exitCode = 1
      return
    }
  }
}

main(process.argv.slice(2))
