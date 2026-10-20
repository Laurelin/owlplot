#!/usr/bin/env node
/**
 * Shared runner for TypeScript scripts: node scripts/run-ts.mjs <entry.ts> [args].
 *
 * Workspace package dist uses extensionless relative imports, so Node's ESM
 * loader cannot import @owlplot/* directly. Bundle the entry with esbuild,
 * then run it. Requires `npm run build` first.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import console from 'node:console'
import process from 'node:process'
import * as esbuild from 'esbuild'

const [entry, ...args] = process.argv.slice(2)
if (!entry) {
  console.error('usage: node scripts/run-ts.mjs <entry.ts> [args]')
  process.exit(2)
}

const outdir = mkdtempSync(join(tmpdir(), 'owlplot-run-ts-'))
const outfile = join(outdir, 'entry.mjs')
process.argv = [process.argv[0], resolve(entry), ...args]

try {
  await esbuild.build({
    entryPoints: [resolve(entry)],
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
