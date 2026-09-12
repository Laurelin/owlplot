#!/usr/bin/env node
/**
 * Runner for scripts/dense-line-cost.ts.
 *
 * Same ESM/dist constraint as export-chart-svg.mjs: bundle with esbuild, then run.
 * Outfile stays under the repo so external `jsdom` resolves from workspace node_modules.
 *
 * Usage: npm run build && npm run measure:dense-line
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const entry = join(root, 'scripts/dense-line-cost.ts')
const outdir = join(root, '.tmp-dense-line-cost')
const outfile = join(outdir, 'dense-line-cost.mjs')

mkdirSync(outdir, { recursive: true })
try {
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    external: ['jsdom'],
  })
  await import(pathToFileURL(outfile).href)
} finally {
  rmSync(outdir, { recursive: true, force: true })
}
