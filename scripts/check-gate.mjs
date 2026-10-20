// Fails when .githooks/pre-commit runs an npm script that `npm run ci` does not run.
// The ci script is the one gate. The hook may only run a subset of it.
import { readFileSync } from 'node:fs'
import console from 'node:console'
import process from 'node:process'
import { missingFromCi, npmScriptsIn } from './check-gate-lib.mjs'

const hook = readFileSync('.githooks/pre-commit', 'utf8')
const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))

const missing = missingFromCi(hook, scripts.ci)
if (missing.length > 0) {
  console.error(
    `check-gate: .githooks/pre-commit runs checks that "npm run ci" does not run: ${missing.join(', ')}`
  )
  process.exitCode = 1
} else {
  console.log(`check-gate: ok (${npmScriptsIn(hook).join(', ')} are in ci)`)
}
