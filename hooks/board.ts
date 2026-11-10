import { atom, read, update } from 'claude-code'
import type { StateDollar } from 'claude-code'

import type { CrewBoard, CrewMember, CrewRun, CrewStatus, CrewVerdict } from '../types'
import { waiting } from './format'
import { CREW, type Crewmate } from './roster'

/** How long a finished crewmate shows Done before it fades back to idle. */
export const DONE_FADE_MS = 10 * 60_000
const ORDER: Record<CrewStatus, number> = { working: 0, needs: 1, done: 2, idle: 3 }
const board = atom({ plugin: 'crew-bridge', key: 'board' } as const, {} as CrewBoard, { shape: 'board-3' })

export type Finished = { name: string; run: CrewRun }
/** One row of the pane; `extra` is the lead's needs-tony line when it is busy. */
export type Row = { mate: Crewmate; member: CrewMember; extra?: string }

// ---- transitions --------------------------------------------------------

/** The lead's own status: the session itself, so one implicit run and no list. */
export function withLead(b: CrewBoard, lead: string, status: CrewStatus, task: string, now: number): CrewBoard {
  return { ...b, [lead]: { status, task, since: now, runs: [] } }
}

/** Adds a run (replacing one with the same agent id); the crewmate works on the newest task since its oldest run began. */
export function withRunStarted(b: CrewBoard, name: string, run: CrewRun): CrewBoard {
  const runs = [...(b[name]?.runs ?? []).filter(one => one.agentId !== run.agentId), run]
  const next: CrewMember = { status: 'working', task: run.task, since: runs[0]!.since, runs }
  if (run.ref) next.ref = run.ref
  return { ...b, [name]: next }
}

/** Ends run `agentId`; the crewmate is Done once its last run ends. An unknown id changes nothing and finishes nothing. */
export function withRunEnded(b: CrewBoard, agentId: string, verdict: CrewVerdict | undefined, now: number): { board: CrewBoard; finished?: Finished } {
  const name = ownerIn(b, agentId)
  const member = name === undefined ? undefined : b[name]
  const run = member?.runs.find(one => one.agentId === agentId)
  if (name === undefined || !member || !run) return { board: b }
  const runs = member.runs.filter(one => one.agentId !== agentId)
  const latest = runs[runs.length - 1]
  const next: CrewMember = latest
    ? { status: member.status, task: latest.task, since: runs[0]!.since, runs }
    : { status: 'done', task: run.task, since: now, runs: [] }
  const ref = latest ? latest.ref : run.ref
  if (ref) next.ref = ref
  // A crewmate still working keeps its last verdict; a finished one shows only this run's.
  const shownVerdict = latest ? verdict ?? member.verdict : verdict
  if (shownVerdict) next.verdict = shownVerdict
  return { board: { ...b, [name]: next }, finished: { name, run } }
}

/** The crewmate one of whose runs is `agentId`. */
export function ownerIn(b: CrewBoard, agentId: string): string | undefined {
  return Object.entries(b).find(([, member]) => member.runs.some(run => run.agentId === agentId))?.[0]
}

// ---- what the board shows -----------------------------------------------

function blank(): CrewMember {
  return { status: 'idle', task: '', since: 0, runs: [] }
}

/** A crewmate as shown at `now`: Done fades to idle after DONE_FADE_MS. */
export function shown(member: CrewMember | undefined, now: number): CrewMember {
  if (!member) return blank()
  if (member.status === 'done' && now - member.since > DONE_FADE_MS) return { ...member, status: 'idle' }
  return member
}

/** The lead shows Needs you while needs-tony items are open and it is not busy; busy, it carries the count as a line. */
function leadRow(mate: Crewmate, member: CrewMember, open: number): Row {
  if (open <= 0) return { mate, member }
  if (member.status === 'idle' || member.status === 'done') return { mate, member: { ...member, status: 'needs', task: waiting(open) } }
  return { mate, member, extra: waiting(open) }
}

/** The lead's team and the shared roles always show; the other team once it has had activity. */
function isVisible(mate: Crewmate, member: CrewMember | undefined, lead: Crewmate): boolean {
  return mate.team === 'shared' || mate.team === lead.team || (member !== undefined && member.since > 0)
}

/** The pane's rows, most urgent first (then roster order), and how many runs are going. */
export function rollCall(b: CrewBoard, lead: Crewmate, open: number, now: number): { rows: Row[]; busy: number } {
  const rows = CREW
    .filter(mate => isVisible(mate, b[mate.name], lead))
    .map(mate => {
      const member = shown(b[mate.name], now)
      return mate.name === lead.name ? leadRow(mate, member, open) : { mate, member }
    })
    .sort((a, c) => ORDER[a.member.status] - ORDER[c.member.status] || CREW.indexOf(a.mate) - CREW.indexOf(c.mate))
  const busy = rows.reduce((sum, row) => sum + (row.member.status === 'working' ? Math.max(1, row.member.runs.length) : 0), 0)
  return { rows, busy }
}

// ---- stored -------------------------------------------------------------

export function readBoard($: StateDollar) {
  return read($, board)
}

export function setLead($: StateDollar, lead: string, status: CrewStatus, task: string) {
  return update($, board, b => withLead(b, lead, status, task, Date.now()))
}

export function startRun($: StateDollar, name: string, run: CrewRun) {
  return update($, board, b => withRunStarted(b, name, run))
}

/** Ends a run; resolves who finished what, if the run was on the board. */
export async function endRun($: StateDollar, agentId: string, verdict: CrewVerdict | undefined): Promise<Finished | undefined> {
  let finished: Finished | undefined
  await update($, board, b => {
    const ended = withRunEnded(b, agentId, verdict, Date.now())
    finished = ended.finished
    return ended.board
  })
  return finished
}

/** The crewmate whose run `agentId` is, else `fallback`. */
export async function ownerOf($: StateDollar, agentId: string | undefined, fallback: string): Promise<string> {
  return (agentId === undefined ? undefined : ownerIn(await read($, board), agentId)) ?? fallback
}
