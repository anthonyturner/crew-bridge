import { atom, read, update } from 'claude-code'
import type { CoreEngineInterface } from 'claude-code'

import type { CrewScore } from '../types'
import { CREW } from './roster'

type ScoreDollar = Pick<CoreEngineInterface, 'state' | 'store'>

/** The `$.store` key; the store outlives the session, so every session adds to the same tally. */
const STORE_KEY = 'score-1'
/** A mirror of the stored scoreboard in state, so the pane redraws when it changes. */
const score = atom({ plugin: 'crew-bridge', key: 'score' } as const, emptyScore(0), { shape: 'score-1' })

// ---- pure ---------------------------------------------------------------

export function dayKey(now: number): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The local ISO week, `2026-W46`. */
export function weekKey(now: number): string {
  const d = new Date(now)
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  const jan4 = new Date(t.getFullYear(), 0, 4)
  const week = 1 + Math.round(((t.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  return `${t.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function emptyScore(now: number): CrewScore {
  return { day: dayKey(now), week: weekKey(now), today: {}, thisWeek: {}, mergesToday: 0, mergesWeek: 0 }
}

/** The score as it stands at `now`: a new week starts empty, a new day keeps the week. Anything unreadable starts empty. */
export function rolled(stored: unknown, now: number): CrewScore {
  if (!isScore(stored) || stored.week !== weekKey(now)) return emptyScore(now)
  const day = dayKey(now)
  return stored.day === day ? stored : { ...stored, day, today: {}, mergesToday: 0 }
}

export function withRun(s: CrewScore, name: string): CrewScore {
  return { ...s, today: { ...s.today, [name]: (s.today[name] ?? 0) + 1 }, thisWeek: { ...s.thisWeek, [name]: (s.thisWeek[name] ?? 0) + 1 } }
}

export function withMerge(s: CrewScore): CrewScore {
  return { ...s, mergesToday: s.mergesToday + 1, mergesWeek: s.mergesWeek + 1 }
}

/** `Today: Vega 2 · merges 1   Week: 9 runs · 4 merges`, crewmates in roster order. */
export function scoreLine(s: CrewScore): string {
  const runs = CREW.filter(mate => (s.today[mate.name] ?? 0) > 0).map(mate => `${mate.name} ${s.today[mate.name]}`)
  const weekRuns = Object.values(s.thisWeek).reduce((sum, n) => sum + n, 0)
  const today = [...runs, `merges ${s.mergesToday}`].join(' · ')
  return `Today: ${today}   Week: ${weekRuns} runs · ${s.mergesWeek} merges`
}

function isScore(value: unknown): value is CrewScore {
  const s = value as CrewScore | null
  return typeof s === 'object' && s !== null && typeof s.day === 'string' && typeof s.week === 'string'
    && typeof s.today === 'object' && typeof s.thisWeek === 'object' && typeof s.mergesToday === 'number' && typeof s.mergesWeek === 'number'
}

// ---- stored -------------------------------------------------------------

/** Mirrors the stored scoreboard into state, so the pane shows what earlier sessions counted. */
export async function loadScore($: ScoreDollar) {
  const stored = await $.store.get(STORE_KEY)
  if (isScore(stored)) await update($, score, () => stored)
}

/** The scoreboard as it stands now. */
export async function readScore($: Pick<CoreEngineInterface, 'state'>) {
  return rolled(await read($, score), Date.now())
}

/** Counts one finished run for `name`. */
export function countRun($: ScoreDollar, name: string) {
  return change($, s => withRun(s, name))
}

/** Counts one merged pull request. */
export function countMerge($: ScoreDollar) {
  return change($, withMerge)
}

/** Re-reads the store before writing, so counts other sessions added survive, then mirrors the result to state. */
async function change($: ScoreDollar, apply: (s: CrewScore) => CrewScore) {
  const next = apply(rolled(await $.store.get(STORE_KEY), Date.now()))
  await $.store.set(STORE_KEY, next)
  await update($, score, () => next)
}
