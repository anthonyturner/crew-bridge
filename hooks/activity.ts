import { atom, read, update } from 'claude-code'
import type { StateDollar } from 'claude-code'

import type { CrewLogEntry } from '../types'

const LOG_SIZE = 6
const log = atom({ plugin: 'crew-bridge', key: 'log' } as const, [] as CrewLogEntry[], { shape: 'log-1' })

/** The log with `entry` added: newest first, the newest few kept. */
export function logged(entries: readonly CrewLogEntry[], entry: CrewLogEntry): CrewLogEntry[] {
  return [entry, ...entries].slice(0, LOG_SIZE)
}

/** Adds a line to the activity log. */
export function note($: StateDollar, text: string) {
  return update($, log, entries => logged(entries, { at: Date.now(), text }))
}

/** The log, newest first. */
export function readLog($: StateDollar) {
  return read($, log)
}
