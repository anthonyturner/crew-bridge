import { atom, read, update } from 'claude-code'
import type { CoreEngineInterface, RenderInput } from 'claude-code'

import type { CrewMember, CrewStatus } from '../types'
import { readLog } from './activity'
import { readBoard, rollCall } from './board'
import { clockTime, minutes } from './format'
import { githubUrl, observatoryUrl, refLabel } from './links'
import { portrait } from './portrait'
import { openNeeds } from './needs'
import type { Crewmate } from './roster'
import { readScore, scoreLine } from './scoreboard'
import { VERDICT } from './verdict'

const LABEL: Record<CrewStatus, string> = { working: 'Working', idle: 'Idle', needs: 'Needs you', done: 'Done' }

type PaneDollar = Pick<CoreEngineInterface, 'state' | 'ui'>

const TICK_MS = 30_000
/** Bumped every TICK_MS; the drawing reads it, so time-on-task and the Done fade redraw without an event. */
const tick = atom({ plugin: 'crew-bridge', key: 'tick' } as const, 0, { shape: 'tick-1' })

/** Keeps the pane's times current while the session runs. */
export function keepPaneCurrent($: Pick<CoreEngineInterface, 'state' | 'clock'>) {
  $.clock.every(TICK_MS, () => { void update($, tick, n => n + 1).catch(() => undefined) })
}

/** `Working ×2 · 12m`, `Done · 3m ago`, or the bare status. */
function statusLine(member: CrewMember, now: number): string {
  const count = member.runs.length > 1 ? ` ×${member.runs.length}` : ''
  if (member.status === 'working') return `Working${count} · ${minutes(now - member.since)}`
  if (member.status === 'done') return `Done · ${minutes(now - member.since)} ago`
  return LABEL[member.status]
}

/** Draws the crew pane. Every value it reads subscribes the drawing, so a change anywhere redraws it. */
export async function renderPane($: PaneDollar, e: RenderInput<'Pane'>, lead: Crewmate) {
  const ui = $.ui.resolve(e)
  const { Box, Text, Link } = ui
  const Svg = 'Svg' in ui ? ui.Svg : undefined
  await read($, tick)
  const now = Date.now()
  const { rows, busy } = rollCall(await readBoard($), lead, await openNeeds($), now)
  const entries = await readLog($)
  const tally = await readScore($)

  return (
    <Box flexDirection="column">
      <Text dimColor>{busy} working</Text>
      <Text dimColor>{scoreLine(tally)}</Text>
      {rows.map(({ mate, member, extra }) => (
        <Box flexDirection="row">
          {Svg && <Svg source={portrait(mate, member.status)} alt={`${mate.name}, ${mate.role}, ${LABEL[member.status]}`} width={48} height={48} />}
          <Box flexDirection="column">
            <Text bold>{mate.name} [{mate.badge}] · {statusLine(member, now)}</Text>
            <Text dimColor>{member.status === 'idle' ? (mate.name === lead.name ? 'Waiting for you' : 'Off duty') : member.task}</Text>
            {extra && <Text color="#ffb547">{extra}</Text>}
            {member.runs.length > 1 && member.runs.slice(0, -1).map(run => <Text dimColor>+ {run.task}</Text>)}
            {member.verdict && member.status !== 'working' && <Text color={VERDICT[member.verdict].color} bold>{VERDICT[member.verdict].text}</Text>}
            {member.ref && member.status !== 'idle' && (
              <Box flexDirection="row">
                <Link href={githubUrl(member.ref)} label={`${refLabel(member.ref)} on GitHub`} />
                <Text dimColor> · </Text>
                <Link href={observatoryUrl(member.ref)} label="Observatory" />
              </Box>
            )}
          </Box>
        </Box>
      ))}
      <Text bold>Activity</Text>
      {entries.length === 0 && <Text dimColor>Nothing yet.</Text>}
      {entries.map(entry => <Text dimColor>{clockTime(entry.at)}  {entry.text}</Text>)}
    </Box>
  )
}
