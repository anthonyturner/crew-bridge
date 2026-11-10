import type { PluginOptions } from 'claude-code'

import { crewmateNamed, type Crewmate } from './roster'

export type Settings = { lead: Crewmate; repo: string; chime: boolean }

const DEFAULT_REPO = 'anthonyturner/rivals_pulse'
const REPO = /^[\w.-]+\/[\w.-]+$/

/** The manifest's `userConfig` values, each one valid: an unusable value reads as its default. */
export function settingsFrom(options: PluginOptions): Settings {
  const repo = options['repo']
  return {
    lead: crewmateNamed(options['lead']),
    repo: typeof repo === 'string' && REPO.test(repo) ? repo : DEFAULT_REPO,
    chime: options['chime'] === true,
  }
}
