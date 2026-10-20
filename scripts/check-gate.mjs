// Fails when .githooks/pre-commit runs an npm script that `npm run ci` does not run.
// The ci script is the one gate. The hook may only run a subset of it.
import { readFileSync } from 'node:fs'
import console from 'node:console'
import process from 'node:process'

const hook = readFileSync('.githooks/pre-commit', 'utf8')
  .split('\n')
  .filter(line => !line.trimStart().startsWith('#'))
  .join('\n')
const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))

const runPattern = /npm run ([\w:-]+)/g
const hookChecks = [...hook.matchAll(runPattern)].map(m => m[1])
const ciChecks = new Set([...scripts.ci.matchAll(runPattern)].map(m => m[1]))

const missing = hookChecks.filter(name => !ciChecks.has(name))
if (missing.length > 0) {
  console.error(
    `check-gate: .githooks/pre-commit runs checks that "npm run ci" does not run: ${missing.join(', ')}`
  )
  process.exit(1)
}
console.log(`check-gate: ok (${hookChecks.join(', ')} are in ci)`)
