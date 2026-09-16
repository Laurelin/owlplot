import { spawnSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'

let input
try {
  input = JSON.parse(
    await new Promise(resolve => {
      let data = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', chunk => {
        data += chunk
      })
      process.stdin.on('end', () => resolve(data))
    })
  )
} catch {
  console.log(
    JSON.stringify({
      permission: 'deny',
      user_message: 'CRAP gate could not parse the pending commit command.',
      agent_message: 'The pre-commit CRAP hook failed closed on invalid input.',
    })
  )
  process.exit(0)
}

if (!/\bgit(?:\s+-\S+)*\s+commit\b/.test(input.command ?? '')) {
  console.log(JSON.stringify({ permission: 'allow' }))
  process.exit(0)
}

const result = spawnSync('npm', ['run', 'crap:check'], {
  cwd: process.cwd(),
  encoding: 'utf8',
})

if (result.status === 0) {
  console.log(JSON.stringify({ permission: 'allow' }))
  process.exit(0)
}

const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
console.log(
  JSON.stringify({
    permission: 'deny',
    user_message: 'Commit blocked by the CRAP/complexity gate.',
    agent_message:
      details || 'Run npm run crap:check and resolve all failures.',
  })
)
