#!/usr/bin/env node
/**
 * Runner for scripts/export-chart-svg.ts.
 *
 * Workspace package dist uses extensionless relative imports, so Node's
 * ESM loader cannot import @owlplot/* directly. Bundle with esbuild (already
 * a transitive dep via vite), then execute. Same constraint as check-exports.mjs.
 *
 * Usage: npm run build && npm run export:svg
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const entry = join(root, 'scripts/export-chart-svg.ts')
const outdir = mkdtempSync(join(tmpdir(), 'owlplot-export-svg-'))
const outfile = join(outdir, 'export-chart-svg.mjs')

try {
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
  })
  await import(pathToFileURL(outfile).href)
} finally {
  rmSync(outdir, { recursive: true, force: true })
}
