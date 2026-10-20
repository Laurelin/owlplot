/**
 * owlplot control CLI. Run after `npm run build`:
 *   npm run control -- render [outDir]
 *
 * render: writes one SVG per fixture variant to
 * <outDir>/<kind>/<variant>.svg (default artifacts/control/render).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chartKindFixtures } from '../fixtures/chartKinds'
import { renderFixtureSvg } from './control/render'

const [command, outArg] = process.argv.slice(2)

if (command !== 'render') {
  console.error('usage: npm run control -- render [outDir]')
  process.exit(2)
}

const outDir = resolve(outArg ?? 'artifacts/control/render')
for (const [kind, { variants }] of Object.entries(chartKindFixtures)) {
  mkdirSync(join(outDir, kind), { recursive: true })
  for (const variant of variants) {
    const file = join(outDir, kind, `${variant.id}.svg`)
    writeFileSync(file, renderFixtureSvg(variant.config))
    console.log(`wrote ${file}`)
  }
}
