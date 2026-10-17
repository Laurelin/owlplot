import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'
import {
  COMPLEXITY_THRESHOLD,
  CRAP_THRESHOLD,
  assertUsableCoverage,
  dedupeCoverageFunctions,
  findGateViolations,
  printViolations,
} from './check-crap-lib.mjs'

const REPORT_PATH = '.crap-report.json'
const COVERAGE_PATH = 'coverage/coverage-final.json'
// The gate covers the published packages. Their tests produce the
// coverage file; demo app entrypoints under apps/ have no coverage
// project, so including them would only ever report them as skipped.
const ANALYZED_PATHS = ['packages/core/src', 'packages/renderer-svg/src']

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  return result
}

function requireSuccess(result, label) {
  if (result.status === 0) return
  const detail = [result.stdout, result.stderr]
    .filter(Boolean)
    .join('\n')
    .trim()
  throw new Error(`${label} failed${detail ? `:\n${detail}` : ''}`)
}

function analyzeCrap() {
  const result = run(
    'npm',
    [
      'exec',
      '--',
      'crap-typescript',
      '--threshold',
      String(CRAP_THRESHOLD),
      '--format',
      'json',
      '--output',
      REPORT_PATH,
      ...ANALYZED_PATHS,
    ],
    { capture: true }
  )

  if (result.status !== 0 && result.status !== 2) {
    requireSuccess(result, 'CRAP analysis')
  }
}

function readViolations() {
  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'))
  return findGateViolations(report.methods)
}

// Analysis only: run `npm run test:coverage` first (npm run ci does).
// Rewrite the coverage file without duplicate fnMap entries (see
// dedupeCoverageFunctions) so measured functions are not skipped as
// ambiguous; the file is a generated artifact and ci regenerates it.
function requireCoverage() {
  if (!existsSync(COVERAGE_PATH)) {
    throw new Error('No coverage found. Run `npm run test:coverage` first.')
  }
  const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'))
  assertUsableCoverage(coverage)
  writeFileSync(
    COVERAGE_PATH,
    `${JSON.stringify(dedupeCoverageFunctions(coverage))}\n`
  )
}

try {
  requireCoverage()
  analyzeCrap()
  const violations = readViolations()
  if (violations.length > 0) {
    printViolations(violations)
    process.exit(2)
  }
  console.log(
    `CRAP gate passed: every analyzed function has CRAP <= ${CRAP_THRESHOLD} and CC <= ${COMPLEXITY_THRESHOLD}, with coverage data.`
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
