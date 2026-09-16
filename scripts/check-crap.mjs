import { globSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'

const CRAP_THRESHOLD = 6
const COMPLEXITY_THRESHOLD = 6
const REPORT_PATH = '.crap-report.json'

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

function generateCoverage() {
  for (const coverageDirectory of globSync('{apps,packages}/*/coverage')) {
    rmSync(coverageDirectory, { recursive: true, force: true })
  }
  requireSuccess(run('npm', ['run', 'build']), 'Build')
  requireSuccess(
    run('npm', [
      'exec',
      '--',
      'vitest',
      'run',
      '--coverage.enabled=true',
      '--coverage.provider=istanbul',
      '--coverage.reporter=json',
      '--coverage.reporter=text',
      '--coverage.reportsDirectory=coverage',
    ]),
    'Coverage test run'
  )
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
    ],
    { capture: true }
  )

  if (result.status !== 0 && result.status !== 2) {
    requireSuccess(result, 'CRAP analysis')
  }
}

function readViolations() {
  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'))
  return report.methods.filter(
    method =>
      (method.crap !== null && method.crap > CRAP_THRESHOLD) ||
      method.cc > COMPLEXITY_THRESHOLD
  )
}

function printViolations(violations) {
  console.error(
    `CRAP gate failed: ${violations.length} function(s) exceed CRAP ${CRAP_THRESHOLD} or CC ${COMPLEXITY_THRESHOLD}.`
  )
  for (const method of violations) {
    const crap = method.crap === null ? 'N/A' : method.crap.toFixed(2)
    console.error(
      `- ${method.src}:${method.lineStart} ${method.method} (CRAP ${crap}, CC ${method.cc})`
    )
  }
}

try {
  generateCoverage()
  analyzeCrap()
  const violations = readViolations()
  if (violations.length > 0) {
    printViolations(violations)
    process.exit(2)
  }
  console.log(
    `CRAP gate passed: every analyzed function has CRAP <= ${CRAP_THRESHOLD} and CC <= ${COMPLEXITY_THRESHOLD}.`
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
