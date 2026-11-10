import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE = {
  plugin: 'crew-bridge',
  component: 'Pane',
  requestId: 'crew-bridge',
  props: {
    title: 'Crew',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

/** The engine beneath the plugin: every call on `$` the plugin makes, answered. */
function engine(on: On, needsTony: number) {
  const store = new Map<string, unknown>()
  on('command.register', () => ({ value: { command: 'crew' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('audio.play', () => ({ value: undefined }))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => { store.set(e.key, e.value); return { value: undefined } })
  on('process.run', () => ({
    value: { exitCode: 0, stdout: JSON.stringify(Array.from({ length: needsTony }, (_, i) => ({ number: i + 1, title: 't' }))), stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.spawn', (_, e) => ({ model: 'opus', agentId: `agent-${e.description.split(' ')[0]}` }))
  on('tool.call', () => ({ result: { stdout: 'merged', stderr: '', interrupted: false } }))
  on('classic.SubagentStop', () => ({}))
}

const SPAWN = { tool_use_id: 'tu', subagentType: 'general-purpose', provider: { plugin: 'engine', tier: 'core' } } as const

test('a run links its issue, logs its start and end, and scores it', async ($, on) => {
  engine(on, 0)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  await $.agent.spawn({ ...SPAWN, description: 'Vega implements the toast fix', prompt: 'Implement issue #1620 in anthonyturner/rivals-pulse-web.' } as never)

  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect((await ui.find({ type: 'Link', text: /Issue #1620/ }))?.text).toBe('Issue #1620 on GitHub')
  expect(await ui.find({ type: 'Text', text: /Vega started: Implements the toast fix/ })).toBeTruthy()
  await ui.unmount()

  await $.classic.SubagentStop({ agent_id: 'agent-Vega', agent_type: 'general-purpose', agent_transcript_path: '', stop_hook_active: false, last_assistant_message: 'Done.' })
  const after = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect(await after.find({ type: 'Text', text: /Vega finished: Implements the toast fix/ })).toBeTruthy()
  expect(await after.find({ type: 'Text', text: /Today: Vega 1 · merges 0/ })).toBeTruthy()
  await after.unmount()
})

test('an Argus approval shows green, a merge is logged and counted', async ($, on) => {
  engine(on, 0)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  await $.agent.spawn({ ...SPAWN, description: 'Argus reviews PR #1611', prompt: 'Review PR #1611.' } as never)
  await $.classic.SubagentStop({ agent_id: 'agent-Argus', agent_type: 'general-purpose', agent_transcript_path: '', stop_hook_active: false, last_assistant_message: 'Verdict: APPROVE' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr merge 1611 --squash' })

  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect((await ui.find({ type: 'Text', text: /^Approved$/ }))?.text).toBe('Approved')
  expect(await ui.find({ type: 'Text', text: /Polaris merged PR #1611/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Argus 1 · merges 1/ })).toBeTruthy()
  await ui.unmount()
})

test('open needs-tony items put the lead on Needs you', async ($, on) => {
  engine(on, 3)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  for (let i = 0; i < 5; i++) await $.tool.call({ tool: 'Bash', command: 'true' }) // let the unawaited first count settle

  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect(await ui.find({ type: 'Text', text: /Polaris \[P\] · Needs you/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /^3 items wait for you$/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Capella/ })).toBeFalsy()
  await ui.unmount()
})
