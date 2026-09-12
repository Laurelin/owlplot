#!/usr/bin/env node
/**
 * Resolve check for @owlplot/core and @owlplot/renderer-svg.
 *
 * Runs the vitest node suite in test/exports.resolve.test.ts, which
 * dynamic-imports both package names so workspace + exports resolution
 * is exercised (after `npm run build`).
 *
 * Prefer vitest over raw `node` import: package dist is ESM without
 * explicit .js extensions in relative imports, which Node's loader
 * rejects but the bundler resolver accepts.
 *
 * Usage: npm run build && npm run check:exports
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  'npx',
  ['vitest', 'run', '--project', 'exports'],
  { cwd: root, stdio: 'inherit', shell: false },
)
process.exit(result.status ?? 1)
