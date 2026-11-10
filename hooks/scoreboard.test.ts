import { expect, test } from 'claude-code/testing'

import { dayKey, emptyScore, rolled, scoreLine, weekKey, withMerge, withRun } from './scoreboard'

const TUESDAY = new Date(2026, 10, 10, 12).getTime()
const WEDNESDAY = new Date(2026, 10, 11, 9).getTime()
const NEXT_MONDAY = new Date(2026, 10, 16, 9).getTime()

test('day and ISO week keys, the week crossing the new year', () => {
  expect(dayKey(TUESDAY)).toBe('2026-11-10')
  expect(weekKey(TUESDAY)).toBe('2026-W46')
  expect(weekKey(new Date(2026, 10, 15, 23).getTime())).toBe('2026-W46')
  expect(weekKey(NEXT_MONDAY)).toBe('2026-W47')
  expect(weekKey(new Date(2027, 0, 1, 12).getTime())).toBe('2026-W53')
})

test('runs and merges count for today and the week', () => {
  const s = withMerge(withRun(withRun(emptyScore(TUESDAY), 'Vega'), 'Argus'))
  expect(s.today).toEqual({ Vega: 1, Argus: 1 })
  expect(s.thisWeek).toEqual({ Vega: 1, Argus: 1 })
  expect(s.mergesToday).toBe(1)
  expect(s.mergesWeek).toBe(1)
  expect(scoreLine(s)).toBe('Today: Vega 1 · Argus 1 · merges 1   Week: 2 runs · 1 merges')
})

test('a new day clears today and keeps the week', () => {
  const next = rolled(withMerge(withRun(emptyScore(TUESDAY), 'Vega')), WEDNESDAY)
  expect(next.day).toBe('2026-11-11')
  expect(next.today).toEqual({})
  expect(next.mergesToday).toBe(0)
  expect(next.thisWeek).toEqual({ Vega: 1 })
  expect(next.mergesWeek).toBe(1)
})

test('the same day is unchanged; a new week, or anything unreadable, starts empty', () => {
  const s = withRun(emptyScore(TUESDAY), 'Vega')
  expect(rolled(s, TUESDAY + 1000)).toBe(s)
  expect(rolled(s, NEXT_MONDAY)).toEqual(emptyScore(NEXT_MONDAY))
  expect(rolled({ day: 3 }, TUESDAY)).toEqual(emptyScore(TUESDAY))
  expect(rolled(undefined, TUESDAY)).toEqual(emptyScore(TUESDAY))
})
