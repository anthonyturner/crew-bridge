import type { CoreEngineInterface, Register } from 'claude-code'

import type { CrewRun } from '../types'
import { note } from './activity'
import { endRun, ownerOf, setLead, startRun } from './board'
import { chime } from './chime'
import { mergedPr, refIn } from './links'
import { checkNeeds } from './needs'
import { keepPaneCurrent, renderPane } from './pane'
import { crewmateIn, withoutName } from './roster'
import { countMerge, countRun, loadScore } from './scoreboard'
import { settingsFrom } from './settings'
import { VERDICT, verdictIn } from './verdict'

const PANE = 'crew-bridge'
const TITLE = 'Crew'
const NEEDS_MS = 5 * 60_000

type CrewDollar = Pick<CoreEngineInterface, 'state' | 'store' | 'ui'>

/** Runs panel work without letting it fail the event it watches: the panel may miss a beat, the session never does. */
function quietly(work: Promise<unknown>): Promise<void> {
  return work.then(() => undefined, () => undefined)
}

async function merged($: CrewDollar, agentId: string | undefined, pr: number, lead: string) {
  await note($, `${await ownerOf($, agentId, lead)} merged PR #${pr}`)
  await countMerge($)
}

async function started($: CrewDollar, name: string, run: CrewRun) {
  await startRun($, name, run)
  await note($, `${name} started: ${run.task}`)
}

async function finished($: CrewDollar, agentId: string, report: string | undefined) {
  // Only the QA reviewer's report carries a verdict.
  const verdict = (await ownerOf($, agentId, '')) === 'Argus' ? verdictIn(report) : undefined
  const done = await endRun($, agentId, verdict)
  if (!done) return
  const line = `${done.name} finished: ${done.run.task}${verdict ? ` (${VERDICT[verdict].text.toLowerCase()})` : ''}`
  $.ui.toast(line)
  await note($, line)
  await countRun($, done.name)
}

export const register: Register = (on, options) => {
  const settings = settingsFrom(options)
  const lead = settings.lead.name

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'crew', description: 'Show the crew panel beside the chat' })
    void $.ui.open({ id: PANE, title: TITLE })
    void quietly(loadScore($))
    void quietly(checkNeeds($, settings))
    keepPaneCurrent($)
    $.clock.every(NEEDS_MS, () => { void quietly(checkNeeds($, settings)) })
    return next(e)
  })

  on('command.run', { command: 'crew' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Crew panel opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    await quietly(setLead($, lead, 'working', 'Working on your request'))
    return next(e)
  })

  on('classic.Stop', async ($, e, next) => {
    await quietly(setLead($, lead, 'idle', 'Waiting for you'))
    return next(e)
  })

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    await quietly(setLead($, lead, 'needs', 'Has a question for you'))
    await quietly(note($, `${lead} asked you a question`))
    chime($, settings.chime)
    const result = await next(e)
    await quietly(setLead($, lead, 'working', 'Working on your request'))
    return result
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const result = await next(e)
    const pr = mergedPr(e.command)
    if (pr !== undefined && result.deny === undefined && !result.isError) await quietly(merged($, e.agentId, pr, lead))
    return result
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    const mate = crewmateIn(e.description, settings.lead) ?? crewmateIn(e.prompt.slice(0, 200), settings.lead)
    if (mate && !result.deny) {
      const run: CrewRun = { agentId: result.agentId ?? e.tool_use_id, task: withoutName(e.description, mate.name), since: Date.now() }
      const ref = refIn(`${e.description}\n${e.prompt}`, settings.repo)
      if (ref) run.ref = ref
      await quietly(started($, mate.name, run))
    }
    return result
  })

  on('classic.SubagentStop', async ($, e, next) => {
    await quietly(finished($, e.agent_id, e.last_assistant_message))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => renderPane($, e, settings.lead))
}
