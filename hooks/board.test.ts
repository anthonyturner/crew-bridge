import { expect, test } from 'claude-code/testing'

import type { CrewBoard, CrewMember, CrewRun } from '../types'
import { DONE_FADE_MS, ownerIn, rollCall, shown, withLead, withRunEnded, withRunStarted } from './board'
import { crewmateNamed } from './roster'

const POLARIS = crewmateNamed('Polaris')
const ref = { repo: 'o/r', kind: 'issue', number: 7 } as const
const run = (agentId: string, since: number, extra: Partial<CrewRun> = {}): CrewRun => ({ agentId, task: `task ${agentId}`, since, ...extra })

test('a started run puts the crewmate to work on it', () => {
  const b = withRunStarted({}, 'Vega', run('a', 100, { ref }))
  expect(b['Vega']).toEqual({ status: 'working', task: 'task a', since: 100, runs: [run('a', 100, { ref })], ref })
})

test('a second run stacks: newest task, oldest start; the same id replaces', () => {
  let b = withRunStarted({}, 'Argus', run('a', 100))
  b = withRunStarted(b, 'Argus', run('b', 200))
  expect(b['Argus']?.task).toBe('task b')
  expect(b['Argus']?.since).toBe(100)
  b = withRunStarted(b, 'Argus', run('b', 300))
  expect(b['Argus']?.runs.map(one => one.agentId)).toEqual(['a', 'b'])
})

test('ending the last run marks Done with its verdict and names who finished', () => {
  const b = withRunStarted({}, 'Argus', run('a', 100, { ref }))
  const ended = withRunEnded(b, 'a', 'approved', 500)
  expect(ended.finished).toEqual({ name: 'Argus', run: run('a', 100, { ref }) })
  expect(ended.board['Argus']).toEqual({ status: 'done', task: 'task a', since: 500, runs: [], ref, verdict: 'approved' })
})

test('ending one of two runs keeps working on the other', () => {
  let b = withRunStarted({}, 'Argus', run('a', 100, { ref }))
  b = withRunStarted(b, 'Argus', run('b', 200))
  const after = withRunEnded(b, 'a', 'changes', 500).board['Argus']
  expect(after?.status).toBe('working')
  expect(after?.task).toBe('task b')
  expect(after?.since).toBe(200)
  expect(after?.ref).toBeUndefined()
  expect(after?.verdict).toBe('changes')
})

test('a Done crewmate drops an earlier verdict when a run without one ends', () => {
  let b = withRunEnded(withRunStarted({}, 'Argus', run('a', 1)), 'a', 'approved', 2).board
  b = withRunEnded(withRunStarted(b, 'Argus', run('b', 3)), 'b', undefined, 4).board
  expect(b['Argus']?.verdict).toBeUndefined()
})

test('an unknown run changes nothing', () => {
  const b: CrewBoard = withRunStarted({}, 'Vega', run('a', 1))
  const ended = withRunEnded(b, 'zzz', undefined, 9)
  expect(ended.board).toBe(b)
  expect(ended.finished).toBeUndefined()
  expect(ownerIn(b, 'a')).toBe('Vega')
  expect(ownerIn(b, 'zzz')).toBeUndefined()
})

test('Done fades to idle after the fade time', () => {
  const done: CrewMember = { status: 'done', task: 't', since: 0, runs: [] }
  expect(shown(done, DONE_FADE_MS).status).toBe('done')
  expect(shown(done, DONE_FADE_MS + 1).status).toBe('idle')
  expect(shown(undefined, 0).status).toBe('idle')
})

test('the roll call: the lead needs you when items wait, the other team hides until active, urgent first', () => {
  let b = withLead({}, 'Polaris', 'idle', 'Waiting for you', 1)
  b = withRunStarted(b, 'Rigel', run('r', 5))
  const { rows, busy } = rollCall(b, POLARIS, 2, 10)
  expect(rows[0]?.mate.name).toBe('Rigel')
  expect(rows[1]?.mate.name).toBe('Polaris')
  expect(rows[1]?.member.status).toBe('needs')
  expect(rows[1]?.member.task).toBe('2 items wait for you')
  expect(rows.some(row => row.mate.name === 'Capella')).toBe(false)
  expect(busy).toBe(1)

  const busyLead = rollCall(withLead(b, 'Polaris', 'working', 'Working on your request', 1), POLARIS, 1, 10)
  const lead = busyLead.rows.find(row => row.mate.name === 'Polaris')
  expect(lead?.member.status).toBe('working')
  expect(lead?.extra).toBe('1 item waits for you')

  const webActive = rollCall(withRunStarted(b, 'Altair', run('w', 5)), POLARIS, 0, 10)
  expect(webActive.rows.some(row => row.mate.name === 'Altair')).toBe(true)
})
