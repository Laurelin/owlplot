import { existsSync, renameSync } from 'node:fs'
import console from 'node:console'
import process from 'node:process'

const FORCE_RESEARCH_PATH = '.cursor/hooks/state/npm-audit-force.json'
const RESEARCH_INPUT_PATH = '.cursor/hooks/state/npm-audit-force-research.json'

if (!existsSync(FORCE_RESEARCH_PATH)) {
  console.log('{}')
  process.exit(0)
}

renameSync(FORCE_RESEARCH_PATH, RESEARCH_INPUT_PATH)

console.log(
  JSON.stringify({
    followup_message:
      'Assign a generalPurpose subagent to research the residual npm vulnerabilities recorded in .cursor/hooks/state/npm-audit-force-research.json. Never apply --force. Have the subagent inspect authoritative advisories, the dry-run upgrade plan, and the affected dependency usage in this repo. Then send the user a concise report for each vulnerability: what it is, why fixing matters, whether the forced upgrade is likely to break this repo, and whether the upgrade is worth doing.',
  })
)
