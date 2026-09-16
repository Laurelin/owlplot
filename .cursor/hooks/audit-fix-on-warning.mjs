import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'

const FORCE_RESEARCH_PATH = '.cursor/hooks/state/npm-audit-force.json'

function readInput() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => {
      data += chunk
    })
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch (error) {
        reject(error)
      }
    })
  })
}

const input = await readInput()
const command = input.command ?? ''
const output = input.output ?? ''
const reportsVulnerabilities = /\b[1-9]\d*\s+vulnerabilit(?:y|ies)\b/i.test(
  output
)

if (!/\bnpm(?:\s|$)/.test(command) || !reportsVulnerabilities) {
  process.exit(0)
}

const result = spawnSync('npm', ['audit', 'fix'], {
  cwd: process.cwd(),
  encoding: 'utf8',
})

const auditOutput = [result.stdout, result.stderr]
  .filter(Boolean)
  .join('\n')
  .trim()

if (auditOutput) {
  process.stderr.write(`[npm audit fix]\n${auditOutput}\n`)
}

if (result.error) {
  throw result.error
}

const audit = spawnSync('npm', ['audit', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
})

if (audit.error) {
  throw audit.error
}

if (audit.status === 0) {
  rmSync(FORCE_RESEARCH_PATH, { force: true })
  process.exit(0)
}

const forceDryRun = spawnSync(
  'npm',
  ['audit', 'fix', '--force', '--dry-run', '--json'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
  }
)

mkdirSync(dirname(FORCE_RESEARCH_PATH), { recursive: true })
writeFileSync(
  FORCE_RESEARCH_PATH,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      audit: {
        status: audit.status,
        stdout: audit.stdout,
        stderr: audit.stderr,
      },
      forceDryRun: {
        status: forceDryRun.status,
        stdout: forceDryRun.stdout,
        stderr: forceDryRun.stderr,
      },
    },
    null,
    2
  )
)

process.stderr.write(
  '[npm audit fix] Vulnerabilities remain and may require --force. A research follow-up has been scheduled; no forced update was applied.\n'
)
