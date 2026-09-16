import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

if (!existsSync('.git')) {
  process.exit(0)
}

const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: process.cwd(),
  stdio: 'inherit',
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
