import { atom, read, update } from 'claude-code'
import type { CoreEngineInterface, ProcessRunResult } from 'claude-code'

import type { CrewNeeds } from '../types'
import { note } from './activity'
import { chime } from './chime'
import { waiting } from './format'
import type { Settings } from './settings'

type NeedsDollar = Pick<CoreEngineInterface, 'state' | 'process' | 'audio'>

const needs = atom({ plugin: 'crew-bridge', key: 'needs' } as const, { count: 0, checkedAt: 0 } as CrewNeeds, { shape: 'needs-1' })

/** The new count from a `gh issue list --json` run; a failed run keeps the last count and says why. */
export function countFrom(ran: ProcessRunResult, before: CrewNeeds, checkedAt: number): CrewNeeds {
  const items = ran.exitCode === 0 ? parsed(ran.stdout) : undefined
  return Array.isArray(items)
    ? { count: items.length, checkedAt }
    : { count: before.count, checkedAt, error: ran.stderr.trim().split('\n')[0] || `gh exited ${ran.exitCode}` }
}

function parsed(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

/** How many needs-tony issues were open at the last count. */
export async function openNeeds($: Pick<CoreEngineInterface, 'state'>) {
  return (await read($, needs)).count
}

/** Counts open needs-tony issues with gh; logs a change and chimes when the count rises. */
export async function checkNeeds($: NeedsDollar, settings: Settings) {
  const before = await read($, needs)
  const checkedAt = Date.now()
  let next: CrewNeeds
  try {
    const ran = await $.process.run(
      ['gh', 'issue', 'list', '-R', settings.repo, '--label', 'needs-tony', '--state', 'open', '--json', 'number,title'],
      { timeoutMs: 20_000 },
    )
    next = countFrom(ran, before, checkedAt)
  } catch (error) {
    next = { count: before.count, checkedAt, error: error instanceof Error ? error.message : String(error) }
  }
  await update($, needs, () => next)
  if (next.error || next.count === before.count) return
  await note($, waiting(next.count))
  if (next.count > before.count) chime($, settings.chime)
}
